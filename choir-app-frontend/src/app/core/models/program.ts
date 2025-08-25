export interface Program {
  id: string;
  choirId: string;
  title: string;
  description?: string;
  startTime?: string;
  status: string;
  items: any[];
}
