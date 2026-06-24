import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts the minimal register payload without financial fields', () => {
    const dto = plainToInstance(RegisterDto, {
      fullName: 'Usuario Prueba',
      email: 'usuario.prueba@gmail.com',
      password: 'Test1234!',
    });

    const errors = validateSync(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });

    expect(errors).toEqual([]);
  });
});
