import restart from 'vite-plugin-restart'

export default {
    root: '', // CORRIGÉ : On laisse vide ou './' car index.html est maintenant à la racine
    publicDir: 'public/', // CORRIGÉ : Le dossier s'appelle maintenant 'public' (et il est à la racine)
    server:
    {
        host: true, 
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    build:
    {
        outDir: 'dist', // CORRIGÉ : Plus besoin de '../dist' car on est déjà à la racine
        emptyOutDir: true, 
        sourcemap: true 
    },
    plugins:
    [
        restart({ restart: [ 'public/**', ] }) // CORRIGÉ : On surveille le dossier 'public'
    ],
}