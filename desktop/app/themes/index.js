
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const TradingPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            100: '{indigo.100}',
            200: '{indigo.200}',
            300: '{indigo.300}',
            400: '{indigo.400}',
            500: '{indigo.500}',
            600: '{indigo.600}',
            700: '{indigo.700}',
            800: '{indigo.800}',
            900: '{indigo.900}',
            950: '{indigo.950}'
        },
        success: {
            50: '#e6f9f0',
            100: '#c0f0d8',
            200: '#99e6c1',
            300: '#70dba9',
            400: '#4dd192',
            500: '#29c67b', 
            600: '#23b76f',
            700: '#1da962',
            800: '#179c55',
            900: '#0e7f44',
            950: '#056032'
        },
        danger: {
            50: '#ffe6e6',
            100: '#ffbfbf',
            200: '#ff9999',
            300: '#ff7373',
            400: '#ff4d4d',
            500: '#ff2626', 
            600: '#e61f1f',
            700: '#cc1818',
            800: '#b31212',
            900: '#990c0c',
            950: '#7f0808'
        },
        background: {
            light: '#f9f9f9',
            dark: '#121212'  
        },
        surface: {
            light: '#ffffff',
            dark: '#1e1e1e'
        },
        text: {
            light: '#000000',
            dark: '#ffffff'
        }
    }
});

export default {
    preset: TradingPreset,
    options: {
        darkModeSelector: '.p-dark', 
        defaultMode: 'light'         
    }
};
