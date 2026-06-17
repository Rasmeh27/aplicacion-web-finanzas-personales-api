import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo valido.'),
  password: z.string().min(1, 'La contrasena es obligatoria.'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Ingresa tu nombre completo.'),
    email: z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo valido.'),
    password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contrasena.'),
    acceptTerms: z.boolean().refine((value) => value, 'Debes aceptar los terminos.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden.',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
