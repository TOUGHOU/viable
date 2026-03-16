/**
 * @file chat.controller.ts
 * @author houfujian houfujian@jd.com
 * @description 项目与对话相关 HTTP 接口，统一 POST；一次对话即一个项目
 */

import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateProjectRequestDto } from './dto/createProject.request.dto';
import { DeleteProjectRequestDto } from './dto/deleteProject.request.dto';
import { DeleteMessageRequestDto } from './dto/deleteMessage.request.dto';
import { GetProjectRequestDto } from './dto/getProject.request.dto';
import { GetProjectsRequestDto } from './dto/getProjects.request.dto';
import { GetMessageRequestDto } from './dto/getMessage.request.dto';
import { GetMessagesRequestDto } from './dto/getMessages.request.dto';
import { SendMessageRequestDto } from './dto/sendMessage.request.dto';
import { UpdateProjectRequestDto } from './dto/updateProject.request.dto';
import { UpdateMessageRequestDto } from './dto/updateMessage.request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('createProject')
  @HttpCode(HttpStatus.CREATED)
  createProject(@Body() dto: CreateProjectRequestDto) {
    return this.chatService.createProject({
      name: dto.name ?? dto.title,
      templateId: dto.templateId ?? null,
      userId: dto.userId,
      hasPreview: dto.hasPreview,
    });
  }

  @Post('getProjects')
  @HttpCode(HttpStatus.OK)
  getProjects(@Body() dto: GetProjectsRequestDto) {
    return this.chatService.getProjects({
      userId: dto.userId,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }

  @Post('getProject')
  @HttpCode(HttpStatus.OK)
  getProject(@Body() dto: GetProjectRequestDto) {
    return this.chatService.getProject(dto.id);
  }

  @Post('updateProject')
  @HttpCode(HttpStatus.OK)
  updateProject(@Body() dto: UpdateProjectRequestDto) {
    return this.chatService.updateProject(dto.id, {
      name: dto.name ?? dto.title,
      hasPreview: dto.hasPreview,
      previewStatus: dto.previewStatus,
    });
  }

  @Post('deleteProject')
  @HttpCode(HttpStatus.OK)
  deleteProject(@Body() dto: DeleteProjectRequestDto) {
    return this.chatService.deleteProject(dto.id);
  }

  @Post('getMessages')
  @HttpCode(HttpStatus.OK)
  getMessages(@Body() dto: GetMessagesRequestDto) {
    return this.chatService.getMessages(dto.projectId, {
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }

  @Post('getMessage')
  @HttpCode(HttpStatus.OK)
  getMessage(@Body() dto: GetMessageRequestDto) {
    return this.chatService.getMessage(dto.projectId, dto.messageId);
  }

  @Post('updateMessage')
  @HttpCode(HttpStatus.OK)
  updateMessage(@Body() dto: UpdateMessageRequestDto) {
    return this.chatService.updateMessage(
      dto.projectId,
      dto.messageId,
      dto.content
    );
  }

  @Post('deleteMessage')
  @HttpCode(HttpStatus.OK)
  deleteMessage(@Body() dto: DeleteMessageRequestDto) {
    return this.chatService.deleteMessage(dto.projectId, dto.messageId);
  }

  @Post('sendMessage')
  @HttpCode(HttpStatus.OK)
  sendMessage(@Body() dto: SendMessageRequestDto) {
    return this.chatService.sendMessage({
      projectId: dto.projectId,
      content: dto.content,
      selectedElements: dto.selectedElements,
    });
  }

  @Post('sendMessageStream')
  async sendMessageStream(
    @Body() dto: SendMessageRequestDto,
    @Res({ passthrough: false }) res: Response
  ) {
    await this.chatService.sendMessageStream(res, {
      projectId: dto.projectId,
      content: dto.content,
      selectedElements: dto.selectedElements,
    });
  }
}
