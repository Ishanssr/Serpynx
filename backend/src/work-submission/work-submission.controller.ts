import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { WorkSubmissionService } from './work-submission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('work-submissions')
@Controller('work-submissions')
@UseGuards(JwtAuthGuard)
export class WorkSubmissionController {
  constructor(private readonly workSubmissionService: WorkSubmissionService) {}

  @Post(':workPartId/submit')
  @ApiOperation({ summary: 'Submit work for a milestone' })
  @ApiParam({ name: 'workPartId', description: 'Work part ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the submitted work'
        }
      }
    }
  })
  async submitWork(
    @Param('workPartId') workPartId: string,
    @Body('description') description: string,
    @Request() req
  ) {
    if (!description?.trim()) {
      throw new BadRequestException('Description is required');
    }

    return this.workSubmissionService.submitWork(workPartId, req.user.id, description);
  }

  @Patch(':submissionId/approve')
  @ApiOperation({ summary: 'Approve a work submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          description: 'Optional approval comment'
        }
      }
    }
  })
  async approveSubmission(
    @Param('submissionId') submissionId: string,
    @Body('comment') comment?: string,
    @Request() req
  ) {
    return this.workSubmissionService.approveSubmission(submissionId, req.user.id, comment);
  }

  @Patch(':submissionId/request-revision')
  @ApiOperation({ summary: 'Request revision for a work submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          description: 'Revision request comment'
        }
      },
      required: ['comment']
    }
  })
  async requestRevision(
    @Param('submissionId') submissionId: string,
    @Body('comment') comment: string,
    @Request() req
  ) {
    if (!comment?.trim()) {
      throw new BadRequestException('Comment is required for revision request');
    }

    return this.workSubmissionService.requestRevision(submissionId, req.user.id, comment);
  }

  @Get('work-part/:workPartId')
  @ApiOperation({ summary: 'Get all submissions for a work part' })
  @ApiParam({ name: 'workPartId', description: 'Work part ID' })
  async getSubmissionsForWorkPart(@Param('workPartId') workPartId: string) {
    return this.workSubmissionService.getSubmissionsForWorkPart(workPartId);
  }
}
