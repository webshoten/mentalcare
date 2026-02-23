// GraphQL関連の共有型定義

// GraphQLレスポンスの基本型
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
  extensions?: Record<string, any>;
}

// Helloクエリのレスポンス型
export interface HelloQueryResponse {
  hello: string;
}

// GraphQLクエリの基本型
export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

// GraphQLエラーの型
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

// APIレスポンスの型
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  details?: string;
  status?: number;
  statusText?: string;
}
