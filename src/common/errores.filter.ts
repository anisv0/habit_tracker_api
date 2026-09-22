import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma';

@Catch()
export class ErroresFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  private traducirPrisma(error: Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { status: HttpStatus.CONFLICT, message: 'Ese registro ya existe' };
    }

    if (error.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'No se encontro el registro solicitado',
      };
    }

    if (error.code === 'P2023' || error.code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'El identificador enviado no es valido',
      };
    }

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'No se pudo completar la operacion en la base de datos',
    };
  }

  private resolver(exception: unknown) {
    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();

      const message =
        typeof respuesta === 'string'
          ? respuesta
          : ((respuesta as { message?: string | string[] }).message ??
            exception.message);

      return { status: exception.getStatus(), message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.traducirPrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Los datos enviados no tienen el formato esperado',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'No hay conexion con la base de datos',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrio un error inesperado en el servidor',
    };
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const contexto = host.switchToHttp();
    const response = contexto.getResponse<Response>();
    const request = contexto.getRequest<Request>();

    const { status, message } = this.resolver(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
