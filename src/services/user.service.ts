import { userRepository } from '../repositories/user.repository';
import { UpdateUserInput } from '../schemas/auth.schema';

export const userService = {
  async update(id: string, input: UpdateUserInput) {
    if (input.email) {
      const existingEmail = await userRepository.findByEmail(input.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error('Email already in use');
      }
    }

    if (input.username) {
      const existingUsername = await userRepository.findByUsername(
        input.username,
      );
      if (existingUsername && existingUsername.id !== id) {
        throw new Error('Username already in use');
      }
    }

    return userRepository.update(id, input);
  },
};
