import zhCN from 'antd/locale/zh_CN';
import { createBrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme, ThemeConfig } from 'antd'
import { RouterProvider } from 'react-router'
import MainLayout from './page/layout';
import Loadable from './component/loader';
import { lazy } from 'react';



const HomePage = Loadable(lazy(() => import('./page/home')));

const AppRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <HomePage workspaceId={"default"} />
      },
      {
        path: "/workspace/:wid",
        element: <HomePage/>
      },
    ]
  }
])



function App() {
  const themeConfig: ThemeConfig = {
    algorithm: theme.defaultAlgorithm,
    components: {
      Menu: {
        itemHeight: 30
      },
      Table: {
        fontSize: 10,
      },
    },
    token: {
      fontSize: 12
    }
  }

  return <ConfigProvider locale={zhCN} theme={themeConfig} componentSize={"small"} >
    <RouterProvider router={AppRouter} />
  </ConfigProvider>
}

export default App
