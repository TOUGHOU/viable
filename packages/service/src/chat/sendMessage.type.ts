/**
 * @file sendMessage.type.ts
 * @author houfujian houfujian@jd.com
 * @description sendMessage / sendMessageStream 方法入参类型，与 SendMessageRequestDto 结构一致
 */

export interface SelectedElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface SelectedElementItem {
  id: string;
  name: string;
  type: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  col: number;
  floorId?: string;
  rect: SelectedElementRect;
}

export interface SendMessageParams {
  projectId: string;
  content: string;
  selectedElements?: SelectedElementItem[];
}
