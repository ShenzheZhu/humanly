#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "fileutils"
require "json"
require "net/http"
require "time"
require "uri"

ROOT = File.expand_path("..", __dir__)
SAMPLES_PATH = File.join(ROOT, "samples.csv")
OUTPUTS_PATH = File.join(ROOT, "detector_outputs.csv")
RAW_DIR = File.join(ROOT, "outputs", "raw", "pangram")
ENDPOINT = ENV.fetch("PANGRAM_API_URL", "https://text.api.pangram.com/v3")
DETECTOR = "pangram"
THRESHOLD_RULE = "Pangram prediction_short: Human => human_compliant; AI/AI-Assisted/Mixed => ai_suspicious; fallback fraction_ai + fraction_ai_assisted >= 0.5"
HEADERS = %w[
  sample_id
  detector
  detector_version
  run_timestamp_utc
  raw_label
  raw_score_json
  ai_probability
  binary_prediction
  threshold_rule
  request_status
  error_notes
].freeze

def usage
  <<~TEXT
    Usage:
      PANGRAM_API_KEY=... ruby data/detector-stress-test/scripts/run_pangram_dry_run.rb
      ruby data/detector-stress-test/scripts/run_pangram_dry_run.rb --dry-run
      PANGRAM_API_KEY=... ruby data/detector-stress-test/scripts/run_pangram_dry_run.rb c1_001 n1_001
  TEXT
end

dry_run = ARGV.delete("--dry-run")
abort usage if ARGV.include?("--help") || ARGV.include?("-h")

samples = CSV.read(SAMPLES_PATH, headers: true).map(&:to_h)
selected_ids = ARGV
samples = samples.select { |row| selected_ids.include?(row.fetch("sample_id")) } unless selected_ids.empty?
abort "No matching samples found for #{selected_ids.join(", ")}" if samples.empty?

if dry_run
  puts "Pangram dry run would process #{samples.length} sample(s):"
  samples.each { |row| puts "- #{row.fetch("sample_id")} #{row.fetch("case_id")} #{row.fetch("policy_label")}" }
  exit 0
end

api_key = ENV["PANGRAM_API_KEY"]
abort "PANGRAM_API_KEY is missing; refusing to run live detector requests." if api_key.to_s.empty?

def post_to_pangram(text, api_key)
  uri = URI(ENDPOINT)
  request = Net::HTTP::Post.new(uri)
  request["Content-Type"] = "application/json"
  request["x-api-key"] = api_key
  request.body = JSON.generate({ text: text, public_dashboard_link: false })

  Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https", open_timeout: 20, read_timeout: 120) do |http|
    http.request(request)
  end
end

def score_payload(raw)
  {
    headline: raw["headline"],
    prediction: raw["prediction"],
    prediction_short: raw["prediction_short"],
    fraction_ai: raw["fraction_ai"],
    fraction_ai_assisted: raw["fraction_ai_assisted"],
    fraction_human: raw["fraction_human"],
    num_ai_segments: raw["num_ai_segments"],
    num_ai_assisted_segments: raw["num_ai_assisted_segments"],
    num_human_segments: raw["num_human_segments"]
  }.compact
end

def ai_probability(raw)
  ai = raw.fetch("fraction_ai", 0).to_f
  assisted = raw.fetch("fraction_ai_assisted", 0).to_f
  [[ai + assisted, 1.0].min, 0.0].max
end

def binary_prediction(raw)
  short = raw["prediction_short"].to_s.strip.downcase
  return "human_compliant" if short == "human"
  return "ai_suspicious" if ["ai", "ai-assisted", "mixed"].include?(short)

  ai_probability(raw) >= 0.5 ? "ai_suspicious" : "human_compliant"
end

FileUtils.mkdir_p(RAW_DIR)
timestamp = Time.now.utc.iso8601
new_rows = []

samples.each do |sample|
  sample_id = sample.fetch("sample_id")
  final_path = File.join(ROOT, sample.fetch("final_text_path"))
  text = File.read(final_path)
  response = post_to_pangram(text, api_key)

  raw_path = File.join(RAW_DIR, "#{sample_id}.json")
  if response.is_a?(Net::HTTPSuccess)
    raw = JSON.parse(response.body)
    File.write(raw_path, JSON.pretty_generate(raw) + "\n")
    new_rows << {
      "sample_id" => sample_id,
      "detector" => DETECTOR,
      "detector_version" => raw["version"],
      "run_timestamp_utc" => timestamp,
      "raw_label" => raw["prediction_short"],
      "raw_score_json" => JSON.generate(score_payload(raw)),
      "ai_probability" => format("%.6f", ai_probability(raw)),
      "binary_prediction" => binary_prediction(raw),
      "threshold_rule" => THRESHOLD_RULE,
      "request_status" => "success",
      "error_notes" => ""
    }
    puts "#{sample_id}: #{raw["prediction_short"]} ai_probability=#{format("%.3f", ai_probability(raw))}"
  else
    error_payload = {
      http_status: response.code.to_i,
      response_body: response.body
    }
    File.write(raw_path, JSON.pretty_generate(error_payload) + "\n")
    new_rows << {
      "sample_id" => sample_id,
      "detector" => DETECTOR,
      "detector_version" => "",
      "run_timestamp_utc" => timestamp,
      "raw_label" => "",
      "raw_score_json" => JSON.generate(error_payload),
      "ai_probability" => "",
      "binary_prediction" => "",
      "threshold_rule" => THRESHOLD_RULE,
      "request_status" => "api_error",
      "error_notes" => "HTTP #{response.code}"
    }
    warn "#{sample_id}: HTTP #{response.code}"
  end
end

existing_rows = if File.exist?(OUTPUTS_PATH)
                  CSV.read(OUTPUTS_PATH, headers: true).map(&:to_h)
                else
                  []
                end

sample_ids = samples.map { |row| row.fetch("sample_id") }
existing_rows.reject! { |row| row["detector"] == DETECTOR && sample_ids.include?(row["sample_id"]) }

CSV.open(OUTPUTS_PATH, "w", write_headers: true, headers: HEADERS) do |csv|
  (existing_rows + new_rows).each { |row| csv << HEADERS.map { |header| row[header] } }
end

puts "Wrote #{new_rows.length} #{DETECTOR} row(s) to #{OUTPUTS_PATH}"
