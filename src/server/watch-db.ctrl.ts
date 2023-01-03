import { Controller } from './controller.type'

export const watchDbController: Controller = ({ watch, db, io }) => {
  db.watch().subscribe((msg) => {})
}
