#!/usr/bin/env python3

import csv
import io
import json
import re
import sys
import textwrap
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - environment preflight handles this.
    PdfReader = None

DATA_DIR = Path(__file__).resolve().parents[1]
HUMAN_SEEDS_PATH = DATA_DIR / "human-seeds.csv"
OUTPUT_CSV_PATH = DATA_DIR / "openreview-paper-contexts.csv"
TEXT_DIR = DATA_DIR / "texts" / "openreview_paper_contexts"
MAX_EXTRACTED_WORDS = 6000


def csv_escape_rows(path, rows, columns):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Humanly detector eval data collection"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Humanly detector eval data collection"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def parse_forum_id(source_url):
    parsed = urllib.parse.urlparse(source_url)
    query = urllib.parse.parse_qs(parsed.query)
    return query.get("id", [""])[0]


def normalize(text):
    return re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", text)).strip()


def word_limited(text, max_words):
    words = normalize(text).split()
    return " ".join(words[:max_words])


def extract_pdf_text(pdf_bytes):
    if PdfReader is None:
        return "", "pypdf unavailable"
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        text = normalize("\n\n".join(pages))
        if not text:
            return "", "pypdf extracted empty text"
        return word_limited(text, MAX_EXTRACTED_WORDS), ""
    except Exception as error:
        return "", f"pypdf extraction error: {error}"


def context_text(seed, content, pdf_url, extracted_text, extraction_notes):
    authors = content.get("authors") or []
    if isinstance(authors, list):
        authors_text = ", ".join(str(author) for author in authors)
    else:
        authors_text = str(authors)
    abstract = normalize(str(content.get("abstract") or ""))
    tldr = normalize(str(content.get("TL;DR") or content.get("tl;dr") or ""))
    venue = normalize(str(content.get("venue") or ""))

    parts = [
        f"Title: {normalize(str(content.get('title') or seed['source_title']))}",
        f"Authors: {authors_text}",
        f"Venue: {venue}",
        f"OpenReview URL: {seed['source_url']}",
        f"PDF URL: {pdf_url}",
    ]
    if tldr:
        parts.append(f"TL;DR: {tldr}")
    parts.append("Abstract:")
    parts.append(abstract)
    if extracted_text:
        parts.append(
            f"Extracted paper text excerpt (first {MAX_EXTRACTED_WORDS} words; machine-extracted from PDF):"
        )
        parts.append(extracted_text)
    else:
        parts.append(f"Extracted paper text excerpt: unavailable ({extraction_notes})")
    return "\n\n".join(parts).strip() + "\n"


def main():
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    with HUMAN_SEEDS_PATH.open(encoding="utf-8", newline="") as handle:
        seeds = list(csv.DictReader(handle))

    long_openreview_seeds = [
        seed
        for seed in seeds
        if seed["length_bucket"] == "long" and seed["source_platform"] == "OpenReview"
    ]
    if len(long_openreview_seeds) != 10:
        raise SystemExit(f"Expected 10 long OpenReview seeds, found {len(long_openreview_seeds)}")

    for seed in long_openreview_seeds:
        forum_id = parse_forum_id(seed["source_url"])
        if not forum_id:
            raise SystemExit(f"Missing forum id in {seed['source_url']}")
        api_url = f"https://api.openreview.net/notes?forum={urllib.parse.quote(forum_id)}"
        payload = fetch_json(api_url)
        forum_note = next((note for note in payload.get("notes", []) if note.get("id") == forum_id), None)
        if forum_note is None:
            raise SystemExit(f"OpenReview forum note not found for {forum_id}")

        content = forum_note.get("content") or {}
        pdf_path = str(content.get("pdf") or "")
        pdf_url = f"https://openreview.net{pdf_path}" if pdf_path.startswith("/") else pdf_path
        extracted_text = ""
        extraction_notes = ""
        if pdf_url:
            pdf_bytes = fetch_bytes(pdf_url)
            extracted_text, extraction_notes = extract_pdf_text(pdf_bytes)
        else:
            extraction_notes = "OpenReview content did not include a PDF URL"

        context_path = TEXT_DIR / f"{seed['seed_id']}.txt"
        context_path.write_text(
            context_text(seed, content, pdf_url, extracted_text, extraction_notes),
            encoding="utf-8",
        )
        rows.append(
            {
                "seed_id": seed["seed_id"],
                "forum_id": forum_id,
                "source_url": seed["source_url"],
                "paper_title": normalize(str(content.get("title") or seed["source_title"])),
                "venue": normalize(str(content.get("venue") or "")),
                "pdf_url": pdf_url,
                "paper_context_text_path": str(context_path.relative_to(DATA_DIR)),
                "paper_context_words": len(context_path.read_text(encoding="utf-8").split()),
                "extraction_notes": extraction_notes,
            }
        )
        print(f"cached {seed['seed_id']} -> {context_path.relative_to(DATA_DIR)}")

    columns = [
        "seed_id",
        "forum_id",
        "source_url",
        "paper_title",
        "venue",
        "pdf_url",
        "paper_context_text_path",
        "paper_context_words",
        "extraction_notes",
    ]
    csv_escape_rows(OUTPUT_CSV_PATH, rows, columns)
    print(f"wrote {OUTPUT_CSV_PATH.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
