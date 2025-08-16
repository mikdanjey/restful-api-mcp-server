/**
 * Mock API responses for testing
 */

export const mockApiResponses = {
  // JSONPlaceholder API responses
  posts: {
    list: [
      {
        userId: 1,
        id: 1,
        title: "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
        body: "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto",
      },
      {
        userId: 1,
        id: 2,
        title: "qui est esse",
        body: "est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla",
      },
    ],
    single: {
      userId: 1,
      id: 1,
      title: "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
      body: "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto",
    },
    created: {
      id: 101,
      title: "New Post",
      body: "This is a new post",
      userId: 1,
    },
    updated: {
      id: 1,
      title: "Updated Post",
      body: "This is an updated post",
      userId: 1,
    },
  },

  users: {
    list: [
      {
        id: 1,
        name: "Leanne Graham",
        username: "Bret",
        email: "Sincere@april.biz",
        address: {
          street: "Kulas Light",
          suite: "Apt. 556",
          city: "Gwenborough",
          zipcode: "92998-3874",
          geo: {
            lat: "-37.3159",
            lng: "81.1496",
          },
        },
        phone: "1-770-736-8031 x56442",
        website: "hildegard.org",
        company: {
          name: "Romaguera-Crona",
          catchPhrase: "Multi-layered client-server neural-net",
          bs: "harness real-time e-markets",
        },
      },
    ],
    single: {
      id: 1,
      name: "Leanne Graham",
      username: "Bret",
      email: "Sincere@april.biz",
      address: {
        street: "Kulas Light",
        suite: "Apt. 556",
        city: "Gwenborough",
        zipcode: "92998-3874",
        geo: {
          lat: "-37.3159",
          lng: "81.1496",
        },
      },
      phone: "1-770-736-8031 x56442",
      website: "hildegard.org",
      company: {
        name: "Romaguera-Crona",
        catchPhrase: "Multi-layered client-server neural-net",
        bs: "harness real-time e-markets",
      },
    },
  },

  // Error responses
  errors: {
    notFound: {
      status: 404,
      message: "Not Found",
    },
    badRequest: {
      status: 400,
      message: "Bad Request",
    },
    unauthorized: {
      status: 401,
      message: "Unauthorized",
    },
    forbidden: {
      status: 403,
      message: "Forbidden",
    },
    internalServerError: {
      status: 500,
      message: "Internal Server Error",
    },
  },
};

export const createMockServer = () => {
  const responses = new Map();

  return {
    // Set up mock responses
    mockGet: (path: string, response: any, status = 200) => {
      responses.set(`GET:${path}`, { response, status });
    },

    mockPost: (path: string, response: any, status = 201) => {
      responses.set(`POST:${path}`, { response, status });
    },

    mockPut: (path: string, response: any, status = 200) => {
      responses.set(`PUT:${path}`, { response, status });
    },

    mockPatch: (path: string, response: any, status = 200) => {
      responses.set(`PATCH:${path}`, { response, status });
    },

    mockDelete: (path: string, response: any, status = 204) => {
      responses.set(`DELETE:${path}`, { response, status });
    },

    // Get mock response
    getResponse: (method: string, path: string) => {
      return responses.get(`${method}:${path}`);
    },

    // Clear all mocks
    clear: () => {
      responses.clear();
    },
  };
};
