import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary';
import DroppWalletPluginDemo from './examples/SampleUsage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <DroppWalletPluginDemo />
        </ErrorBoundary>
    </React.StrictMode>,
)