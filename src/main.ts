import './ui/styles.css';
import { mount } from './ui/app';

const root = document.querySelector('#app');
if (root instanceof HTMLElement) mount(root);
