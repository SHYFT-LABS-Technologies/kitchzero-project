import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';
import { validateData } from '@kitchzero/utils';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = validateData(schema, request.body);
    
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: result.errors
      });
    }
    
    request.body = result.data;
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = validateData(schema, request.query);
    
    if (!result.success) {
      return reply.status(400).send({
        error: 'Query validation failed',
        details: result.errors
      });
    }
    
    request.query = result.data;
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = validateData(schema, request.params);
    
    if (!result.success) {
      return reply.status(400).send({
        error: 'Parameter validation failed',
        details: result.errors
      });
    }
    
    request.params = result.data;
  };
}