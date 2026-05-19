export type DownloadOutcome = 'saved' | 'downloaded' | 'canceled';

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface FileSaveHandle {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

type WindowWithSavePicker = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSaveHandle>;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function requestSaveFileHandle(options: {
  filename: string;
  description: string;
  mimeType: string;
  extensions: string[];
}): Promise<FileSaveHandle | 'canceled' | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const saveFilePicker = (window as WindowWithSavePicker).showSaveFilePicker;
  if (!saveFilePicker) {
    return null;
  }

  try {
    return await saveFilePicker.call(window, {
      suggestedName: options.filename,
      types: [{
        description: options.description,
        accept: {
          [options.mimeType]: options.extensions,
        },
      }],
    });
  } catch (error) {
    if (isAbortError(error)) {
      return 'canceled';
    }

    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): DownloadOutcome {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);

  return 'downloaded';
}

export async function downloadBlobWithSavePicker(
  loadBlob: () => Promise<Blob>,
  options: {
    filename: string;
    description: string;
    mimeType: string;
    extensions: string[];
  }
): Promise<DownloadOutcome> {
  const saveHandle = await requestSaveFileHandle(options);
  if (saveHandle === 'canceled') {
    return 'canceled';
  }

  const blob = await loadBlob();

  if (saveHandle) {
    const writable = await saveHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'saved';
  }

  return downloadBlob(blob, options.filename);
}
