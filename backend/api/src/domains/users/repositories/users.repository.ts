import { prisma } from "../../../database/index.js";
import { User } from "@prisma/client";

export class UsersRepository {
  async findUserByUsernameExcludingId(username: string, excludeUserId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        username,
        NOT: { id: excludeUserId },
      },
    });
  }

  async updateUser(id: string, data: any): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}
