import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { RegisterSchema, LoginSchema } from '../domains/auth/dto/auth.dto.js';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful registration',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Login a user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successful login',
    },
  },
});

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Moots API',
      description: 'REST API for the Moots platform',
    },
    servers: [{ url: '/api' }],
  });
}
