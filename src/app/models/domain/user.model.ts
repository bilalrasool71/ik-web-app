export class UserLoginRequestDto {
    username!: string;
    password!: string;
}

export class UserLoginResponseDto {
    token!: string;
    username!: string;
    userId!: number;
    fullName!: string;
    userImg!: string;
}