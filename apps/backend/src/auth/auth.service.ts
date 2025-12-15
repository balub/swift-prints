import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'admin';
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  username: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminUsername: string;
  private readonly adminPasswordHash: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.adminUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    
    // Pre-hash the password for comparison (in production, store hashed passwords)
    // For simplicity, we'll do a sync hash at startup
    this.adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
    
    this.logger.log(`Admin auth configured for user: ${this.adminUsername}`);
  }

  async validateAdmin(username: string, password: string): Promise<boolean> {
    if (username !== this.adminUsername) {
      return false;
    }
    
    return bcrypt.compare(password, this.adminPasswordHash);
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const isValid = await this.validateAdmin(username, password);
    
    if (!isValid) {
      this.logger.warn(`Failed login attempt for user: ${username}`);
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = {
      sub: 'admin-1',
      username: this.adminUsername,
      role: 'admin',
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');

    this.logger.log(`Admin login successful: ${username}`);

    return {
      accessToken,
      expiresIn,
      username: this.adminUsername,
    };
  }

  validateToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }
}

