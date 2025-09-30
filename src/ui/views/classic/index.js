import resolvers, { classicResolvers } from './resolvers.js';

const classicView = {
  id: 'classic',
  name: 'Classic Dashboard',
  resolvers,
  presenters: {}
};

export { classicResolvers };
export default classicView;
