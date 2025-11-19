import { userRepository } from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../lib/hash';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';

export const authService = {
  async register(input: RegisterInput) {
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new Error('Email already in use');
    }

    const existingUsername = await userRepository.findByUsername(
      input.username,
    );
    if (existingUsername) {
      throw new Error('Username already in use');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await userRepository.create({
      ...input,
      password: hashedPassword,
    });

    return user;
  },

  async validateUser(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      return null;
    }

    return user;
  },
};
