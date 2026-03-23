/**
 * @file: index.ts
 * @author: houfujian houfujian@jd.com
 */
export interface SelectedElement {
  id: string;
  name: string;
  type: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  col: number;
  floorId?: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  };
}
