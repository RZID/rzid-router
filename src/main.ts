import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { restoreSession } from './lib/api/ubus'

restoreSession()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
