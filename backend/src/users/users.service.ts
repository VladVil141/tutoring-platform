import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { TutorProfile } from './entities/tutor-profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(TutorProfile)
    private tutorProfileRepository: Repository<TutorProfile>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, role, first_name, last_name, phone } = createUserDto;

    // Проверяем, существует ли пользователь
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = new User();
    user.email = email;
    user.password_hash = hashedPassword;
    user.role = role;
    
    await this.userRepository.save(user);

    // Создаем профиль
    const profile = new Profile();
    profile.user = user;
    profile.first_name = first_name;
    profile.last_name = last_name;
    profile.phone = phone || null;
    profile.avatar_url = null;
    profile.bio = null;
    profile.city = null;
    profile.date_of_birth = null;
    
    await this.profileRepository.save(profile);

    // Если это репетитор, создаем tutor_profile
    if (role === 'tutor') {
      const tutorProfile = new TutorProfile();
      tutorProfile.profile = profile;
      tutorProfile.education = null;
      tutorProfile.experience = null;
      tutorProfile.is_verified = false;
      // ✅ Убрали subjects и hourly_rate
      
      await this.tutorProfileRepository.save(tutorProfile);
    }

    // Загружаем пользователя с отношениями
    const createdUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['profile', 'profile.tutor_profile']
    });

    if (!createdUser) {
      throw new Error('Ошибка при создании пользователя');
    }

    return createdUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['profile', 'profile.tutor_profile']
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { id },
      relations: ['profile', 'profile.tutor_profile']
    });
  }

  async getPublicProfile(userId: number): Promise<any> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Возвращаем публичную информацию
    const publicProfile: any = {
      id: user.id,
      first_name: user.profile.first_name,
      last_name: user.profile.last_name,
      avatar_url: user.profile.avatar_url,
      bio: user.profile.bio,
      city: user.profile.city,
      role: user.role,
    };

    if (user.role === 'tutor' && user.profile.tutor_profile) {
      publicProfile.education = user.profile.tutor_profile.education;
      publicProfile.experience = user.profile.tutor_profile.experience;
      publicProfile.is_verified = user.profile.tutor_profile.is_verified;
      // ✅ Убрали subjects и hourly_rate
    }

    return publicProfile;
  }

  async updateProfile(userId: number, updateData: UpdateProfileDto): Promise<any> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Обновляем основные поля профиля
    const profileUpdate: any = {};
    const fields = ['first_name', 'last_name', 'avatar_url', 'phone', 'bio', 'city'];
    fields.forEach(field => {
      if (updateData[field] !== undefined) {
        profileUpdate[field] = updateData[field];
      }
    });

    if (Object.keys(profileUpdate).length > 0) {
      await this.profileRepository.update(
        { id: user.profile.id },
        profileUpdate
      );
    }

    // Если это репетитор, обновляем tutor_profile
    if (user.role === 'tutor' && user.profile.tutor_profile) {
      const tutorUpdate: any = {};
      const tutorFields = ['education', 'experience']; // ✅ Только education и experience
      tutorFields.forEach(field => {
        if (updateData[field] !== undefined) {
          tutorUpdate[field] = updateData[field];
        }
      });

      if (Object.keys(tutorUpdate).length > 0) {
        await this.tutorProfileRepository.update(
          { id: user.profile.tutor_profile.id },
          tutorUpdate
        );
      }
    }

    return this.getPublicProfile(userId);
  }
}