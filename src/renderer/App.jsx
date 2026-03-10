import { page, toastMessage, toastType, toastVisible } from './store';
import Titlebar from './Titlebar';
import Editor from './Editor';
import Settings from './Settings';
import ProjectPicker from './ProjectPicker';

export default function App() {
  return (
    <>
      <Titlebar />
      <div style={{ display: page() === 'projects' ? 'flex' : 'none', flex: 1, overflow: 'hidden', "flex-direction": 'column' }}>
        <ProjectPicker />
      </div>
      <div style={{ display: page() === 'editor' ? 'flex' : 'none', flex: 1, overflow: 'hidden', "flex-direction": 'column' }}>
        <Editor />
      </div>
      <div style={{ display: page() === 'settings' ? 'flex' : 'none', flex: 1, overflow: 'hidden', "flex-direction": 'column' }}>
        <Settings />
      </div>
      <div class="toast" classList={{ show: toastVisible(), success: toastType() === 'success', error: toastType() === 'error' }}>
        {toastMessage()}
      </div>
    </>
  );
}
