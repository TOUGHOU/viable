/**
 * @file chat.controller.ts
 * @author houfujian houfujian@jd.com
 * @description 对话相关 HTTP 接口，统一 POST
 */

import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { CreateConversationRequestDto } from './dto/createConversation.request.dto';
import { DeleteConversationRequestDto } from './dto/deleteConversation.request.dto';
import { DeleteMessageRequestDto } from './dto/deleteMessage.request.dto';
import { GetConversationRequestDto } from './dto/getConversation.request.dto';
import { GetConversationsRequestDto } from './dto/getConversations.request.dto';
import { GetMessageRequestDto } from './dto/getMessage.request.dto';
import { GetMessagesRequestDto } from './dto/getMessages.request.dto';
import { SendMessageRequestDto } from './dto/sendMessage.request.dto';
import { UpdateConversationRequestDto } from './dto/updateConversation.request.dto';
import { UpdateMessageRequestDto } from './dto/updateMessage.request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('createConversation')
  @HttpCode(HttpStatus.CREATED)
  createConversation(@Body() dto: CreateConversationRequestDto) {
    return this.chatService.createConversation({
      title: dto.title,
      hasPreview: dto.hasPreview,
    });
  }

  @Post('getConversations')
  @HttpCode(HttpStatus.OK)
  getConversations(@Body() dto: GetConversationsRequestDto) {
    return this.chatService.getConversations({
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }

  @Post('getConversation')
  @HttpCode(HttpStatus.OK)
  getConversation(@Body() dto: GetConversationRequestDto) {
    return this.chatService.getConversation(dto.id);
  }

  @Post('updateConversation')
  @HttpCode(HttpStatus.OK)
  updateConversation(@Body() dto: UpdateConversationRequestDto) {
    return this.chatService.updateConversation(dto.id, {
      title: dto.title,
      hasPreview: dto.hasPreview,
    });
  }

  @Post('deleteConversation')
  @HttpCode(HttpStatus.OK)
  deleteConversation(@Body() dto: DeleteConversationRequestDto) {
    return this.chatService.deleteConversation(dto.id);
  }

  @Post('getMessages')
  @HttpCode(HttpStatus.OK)
  getMessages(@Body() dto: GetMessagesRequestDto) {
    return this.chatService.getMessages(dto.conversationId, {
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }

  @Post('getMessage')
  @HttpCode(HttpStatus.OK)
  getMessage(@Body() dto: GetMessageRequestDto) {
    return this.chatService.getMessage(dto.conversationId, dto.messageId);
  }

  @Post('updateMessage')
  @HttpCode(HttpStatus.OK)
  updateMessage(@Body() dto: UpdateMessageRequestDto) {
    return this.chatService.updateMessage(
      dto.conversationId,
      dto.messageId,
      dto.content
    );
  }

  @Post('deleteMessage')
  @HttpCode(HttpStatus.OK)
  deleteMessage(@Body() dto: DeleteMessageRequestDto) {
    return this.chatService.deleteMessage(dto.conversationId, dto.messageId);
  }

  @Post('sendMessage')
  @HttpCode(HttpStatus.OK)
  sendMessage(@Body() dto: SendMessageRequestDto) {
    return this.chatService.sendMessage({
      conversationId: dto.conversationId,
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
      conversationId: dto.conversationId,
      content: dto.content,
      selectedElements: dto.selectedElements,
    });
  }
}
