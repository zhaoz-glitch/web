import { type RouteConfig, index ,route} from "@react-router/dev/routes";

export default [index("routes/home.tsx"),route("products", "./welcome/welcome.tsx")] satisfies RouteConfig;
