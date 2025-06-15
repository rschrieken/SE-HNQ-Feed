const esbuild = require('esbuild');
const {copy: copyPlugin} = require('esbuild-plugin-copy');

const buildConfig = {
  entryPoints: ['server.js'],
  bundle: true,
  outdir: 'dist',      
  platform: 'node',    
  format: 'cjs',    
  packages: 'external',
  plugins: [
    copyPlugin({
      resolve: true,
      assets: {
        from: ['./public/**'], 
        to: ['./public'],  
      },
    }),
    copyPlugin({
      resolve: true,
      assets: {
        from: ['./build/package.dist.json'], 
        to: ['./package.json'],  
      },
    }),
    copyPlugin({
      resolve: true,
      assets: {
        from: ['./views/**'],
        to: ['./views'],  
      },
    }),
  ],
};

esbuild.build(buildConfig);
