import {
  MOCK_DASHBOARD, MOCK_PRODUCTS, MOCK_SALES, MOCK_USERS,
  MOCK_COUPONS, MOCK_BOTS, MOCK_BOT_TELEGRAM, MOCK_BOT_DISCORD,
  MOCK_SETTINGS, MOCK_GALLERY,
} from './data';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const GET_HANDLERS: Record<string, () => unknown> = {
  '/api/dashboard':      () => MOCK_DASHBOARD,
  '/api/products':       () => [...MOCK_PRODUCTS],
  '/api/sales':          () => [...MOCK_SALES],
  '/api/users':          () => [...MOCK_USERS],
  '/api/coupons':        () => [...MOCK_COUPONS],
  '/api/bots':           () => [...MOCK_BOTS],
  '/api/bots/telegram':  () => ({ ...MOCK_BOT_TELEGRAM }),
  '/api/bots/discord':   () => ({ ...MOCK_BOT_DISCORD }),
  '/api/settings':       () => ({ ...MOCK_SETTINGS }),
  '/api/gallery':        () => [...MOCK_GALLERY],
  '/api/campaigns':      () => [],
};

const mockResponse = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as any });

const mockApi = {
  get: async (url: string) => {
    await delay();
    const handler = GET_HANDLERS[url] ?? (() => ({}));
    return mockResponse(handler());
  },
  post: async (_url: string, _data?: unknown) => {
    await delay();
    return mockResponse({ success: true });
  },
  put: async (_url: string, _data?: unknown) => {
    await delay();
    return mockResponse({ success: true });
  },
  delete: async (_url: string) => {
    await delay();
    return mockResponse({ success: true });
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
  defaults: { headers: { common: {} } },
};

export default mockApi;
