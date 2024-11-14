import { Content } from "antd/es/layout/layout";
import React from "react";
import { Outlet } from "react-router";


const MainLayout: React.FC = () => {
    return <Content style={{ padding: '5px', height: "97vh" }}>
        <Outlet />
    </Content>
}


export default MainLayout