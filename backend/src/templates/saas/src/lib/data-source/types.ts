export type Where = Record<string, unknown>;
export type OrderBy = Record<string, "asc" | "desc">;

export interface ListOptions {
  where?: Where;
  orderBy?: OrderBy;
  take?: number;
  skip?: number;
}

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: string;
  [key: string]: unknown;
}

export interface DataSource {
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  createUser(data: {
    email: string;
    password: string;
    name?: string | null;
    role?: string;
  }): Promise<UserRecord>;

  list(
    collection: string,
    opts?: ListOptions
  ): Promise<Record<string, unknown>[]>;
  get(collection: string, id: string): Promise<Record<string, unknown> | null>;
  create(
    collection: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  remove(collection: string, id: string): Promise<void>;
  count(collection: string, where?: Where): Promise<number>;
}
