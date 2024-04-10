import { json } from '@remix-run/node';

const posts = [
    { id: 1, title: 'Post 1', content: 'This is post 1' },
    { id: 2, title: 'Post 2', content: 'This is post 2' },
  ];

export async function action() {
    return json(posts);
}

export async function loader() {
  return `API route`;
}
