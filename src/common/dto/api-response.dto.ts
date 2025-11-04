import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data (if any)',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request ID for tracing',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  requestId?: string;
}
