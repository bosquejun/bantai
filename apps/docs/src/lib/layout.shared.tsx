import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <div className="flex items-center space-x-2 group cursor-pointer">
          <div className="size-10 flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-12">
            <Image src="/bantai.svg" alt="Bantai" width={40} height={40} className='dark:invert' />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-[0.3em] dark:text-white text-black uppercase leading-none">BANTAI</span>
          </div>
        </div>,
    },
    githubUrl:'https://github.com/bosquejun/bantai',
    links:[{
      text:'Docs',
      url:'/docs',
    }]
  };
}
