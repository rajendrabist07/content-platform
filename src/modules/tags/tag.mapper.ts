import type { Tag } from '@prisma/client';
import type { TagResponseDTO } from './tag.dto';

export function toTagDTO(tag: Tag): TagResponseDTO {
  return { id: tag.id, name: tag.name };
}