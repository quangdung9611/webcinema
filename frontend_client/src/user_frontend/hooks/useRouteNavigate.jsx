import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRouteLoading } from "../context/RouteLoadingContext";

const DEFAULT_LOADING_TIME = 250;

const useRouteNavigate = () => {

    const navigate = useNavigate();

    const {

        startLoading,
        stopLoading

    } = useRouteLoading();

    const routeNavigate = useCallback(

        (

            to,

            options = {},

            loadingTime = DEFAULT_LOADING_TIME

        ) => {

            startLoading();

            setTimeout(() => {

                navigate(to, options);

                setTimeout(() => {

                    stopLoading();

                }, loadingTime);

            }, 0);

        },

        [

            navigate,

            startLoading,

            stopLoading

        ]

    );

    return routeNavigate;

};

export default useRouteNavigate;