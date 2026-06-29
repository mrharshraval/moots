import { UsersRepository } from "../repositories/users.repository.js";
import { UpdateSettingsInput } from "../dto/users.dto.js";
import { ValidationError, ConflictError } from "../../../shared/errors/AppError.js";

export class UsersService {
  private repository: UsersRepository;

  constructor() {
    this.repository = new UsersRepository();
  }

  async updateSettings(data: UpdateSettingsInput & { userId: string }) {
    const { userId, username, name, bio, image } = data;

    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        throw new ValidationError("Invalid username format");
      }

      const existingUser = await this.repository.findUserByUsernameExcludingId(username, userId);
      if (existingUser) {
        throw new ConflictError("Username is already taken");
      }
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (image !== undefined) updateData.image = image;

    const updatedUser = await this.repository.updateUser(userId, updateData);

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      bio: updatedUser.bio,
      image: updatedUser.image,
    };
  }
}
