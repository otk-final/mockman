import { Progress } from 'antd';
import { Suspense, useEffect, useState } from 'react';

// ==============================|| LOADER ||============================== //
export const Loader = () => {

    // <div style={{
    //     position:'fixed',
    //     top: 0,
    //     left: 0,
    //     zIndex: 1301,
    //     width: '100%'
    // }}>

    // </div>
    const [percent, setPercent] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            // 每隔1秒钟，count 值加1
            setPercent((prevCount) => prevCount + 10);
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, [])

    return <Progress percent={percent} showInfo={false} size={['100%', 2]} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        margin: -10,
        padding: 0,
        zIndex: 1301,
        width: '100%'
    }} />
}


const Loadable = (Component: any) => (props: any) =>
(
    <Suspense fallback={<Loader />}>
        <Component {...props} />
    </Suspense>
);

export default Loadable;
