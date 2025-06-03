export type MenuAction = 'select' | 'edit' | 'regenerate' | 'quit';
export interface MenuChoice {
  index: number;
  action: MenuAction;
  editedMessage?: string;
}
