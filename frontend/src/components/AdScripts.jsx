import { useEffect } from 'react';

const AdScripts = () => {
    useEffect(() => {
        // Find target to append to (HTML or Body)
        const target = [document.documentElement, document.body].filter(Boolean).pop();
        if (!target) return;

        // Script 1: al5sm.com
        const script1 = document.createElement('script');
        script1.dataset.zone = '10323457';
        script1.src = 'https://al5sm.com/tag.min.js';

        // Script 2: 3nbf4.com
        const script2 = document.createElement('script');
        script2.src = 'https://3nbf4.com/act/files/tag.min.js?z=10323459';
        script2.setAttribute('data-cfasync', 'false');
        script2.async = true;

        // Append scripts
        target.appendChild(script1);
        target.appendChild(script2);

        // Cleanup on unmount
        return () => {
            if (target.contains(script1)) target.removeChild(script1);
            if (target.contains(script2)) target.removeChild(script2);
        };
    }, []);

    return null;
};

export default AdScripts;
