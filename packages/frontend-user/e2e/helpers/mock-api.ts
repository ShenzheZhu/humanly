import { Page, Route } from '@playwright/test';

type JsonValue = Record<string, unknown> | unknown[];

async function fulfillJson(route: Route, body: JsonValue, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockLoginFlow(page: Page) {
  const user = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    emailVerified: true,
    createdAt: '2026-03-14T12:00:00.000Z',
    updatedAt: '2026-03-14T12:00:00.000Z',
  };

  await page.route('**/api/v1/auth/login', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken: 'playwright-access-token',
      },
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: { user },
    });
  });

  return { user };
}

export async function mockDocumentsApi(page: Page) {
  const document = {
    id: 'doc-1',
    userId: 'user-1',
    title: 'Playwright Draft',
    content: {},
    plainText: '',
    status: 'draft',
    wordCount: 0,
    characterCount: 0,
    createdAt: '2026-03-14T12:00:00.000Z',
    updatedAt: '2026-03-14T12:00:00.000Z',
  };

  let created = false;
  let hasProject = false;

  await page.route('**/api/v1/documents', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await fulfillJson(route, {
        success: true,
        data: created ? [document] : [],
        pagination: {
          total: created ? 1 : 0,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });
      return;
    }

    if (method === 'POST') {
      created = true;
      await fulfillJson(route, {
        success: true,
        data: {
          document,
        },
        message: 'Document created successfully',
      }, 201);
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/v1/projects?limit=1', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: hasProject
        ? [{ id: 'project-1', name: 'Default Project' }]
        : [],
    });
  });

  await page.route('**/api/v1/projects', async (route) => {
    if (route.request().method() === 'POST') {
      hasProject = true;
      await fulfillJson(route, {
        success: true,
        data: {
          project: { id: 'project-1', name: 'Default Project' },
        },
      }, 201);
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/v1/projects/project-1/papers', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        paper: {
          id: 'paper-1',
          title: document.title,
          documentId: document.id,
        },
      },
    }, 201);
  });

  await page.route('**/api/v1/documents/doc-1', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, {
        success: true,
        data: { document },
      });
      return;
    }

    if (route.request().method() === 'PUT') {
      await fulfillJson(route, {
        success: true,
        data: { document },
        message: 'Document updated successfully',
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/v1/documents/doc-1/paper', async (route) => {
    await fulfillJson(route, {
      success: false,
      error: 'Not found',
      message: 'No linked paper',
    }, 404);
  });

  await page.route('**/api/v1/documents/doc-1/events', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: '1 events tracked successfully',
    });
  });

  return { document };
}

export async function mockCertificatesApi(page: Page) {
  const certificate = {
    id: 'cert-1',
    title: 'Playwright Draft',
    documentId: 'doc-1',
    certificateType: 'full_authorship',
    verificationToken: 'verify-token-123',
    generatedAt: '2026-03-14T12:30:00.000Z',
    typedCharacters: 120,
    pastedCharacters: 0,
    totalCharacters: 120,
    totalEvents: 15,
    typingEvents: 15,
    editingTimeSeconds: 180,
    isProtected: false,
    accessCode: null,
    includeFullText: true,
    includeEditHistory: true,
  };

  await page.route('**/api/v1/certificates', async (route) => {
    if (route.request().method() === 'POST') {
      await fulfillJson(route, {
        success: true,
        data: { certificate },
        message: 'Certificate generated successfully',
      }, 201);
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/v1/certificates/cert-1', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: { certificate },
    });
  });

  await page.route('**/api/v1/certificates/cert-1/ai-stats', async (route) => {
    await fulfillJson(route, {
      data: {
        selectionActions: {
          grammarFixes: 1,
          improveWriting: 0,
          simplify: 0,
          makeFormal: 0,
          total: 1,
          accepted: 1,
          rejected: 0,
          acceptanceRate: 100,
        },
        aiQuestions: {
          total: 0,
          understanding: 0,
          generation: 0,
          other: 0,
        },
      },
    });
  });

  await page.route('**/api/v1/certificates/cert-1/display-options', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: { certificate },
    });
  });

  await page.route('**/api/v1/certificates/cert-1/access-code', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: { certificate },
    });
  });

  return { certificate };
}
