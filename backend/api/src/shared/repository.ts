import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../database/index.js";

/**
 * Type representing either the main Prisma client or a transactional client.
 * Repositories should accept this to support operations within a transaction.
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Base Repository pattern implementation.
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected constructor(protected readonly defaultClient: PrismaClient = prisma) {}

  /**
   * Use this method to execute queries. It ensures the repository
   * uses the provided transactional client, or falls back to the default client.
   */
  protected getClient(tx?: TransactionClient): TransactionClient {
    return tx ?? this.defaultClient;
  }

  // Common CRUD operations can be defined here, although many repositories
  // prefer explicit methods per domain.
  // abstract findById(id: string, tx?: TransactionClient): Promise<T | null>;
  // abstract create(data: CreateInput, tx?: TransactionClient): Promise<T>;
  // abstract update(id: string, data: UpdateInput, tx?: TransactionClient): Promise<T>;
  // abstract delete(id: string, tx?: TransactionClient): Promise<void>;
}
