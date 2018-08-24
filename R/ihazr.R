#' ihazr
#'
#' \code{ihazr} interactively updates a hazard function for survival anaylisis.
#' This function creates an HTML widget for survival data. The widget allows the
#' user to choose subsections of their data and plot the nonparametric kernel
#' estimated hazard function and cumulative hazard function.
#'
#' @import htmlwidgets
#' @param time A numerical vector of time data.
#' @param status A binary vector representing event or no event.
#' @param marker A collection of numerical variables of interest for survival
#'   analysis.
#' @param width The width of the html widget. The default is NULL, which results
#'   in intelligent automatic sizing based on the widget's container.
#' @param height The height of the html widget. The default is NULL, which
#'   results in intelligent automatic sizing based on the widget's container.
#' @return ihazr of data values \code{time}, \code{status}, and \code{marker}
#' @examples
#' Example 1 - simulated data
#' time_t <- runif(50, 0, 10)
#' status_t <- rbinom(50, 1, .7)
#' age_t <- runif(50, 20, 80)
#' ihazr(time_t, status_t, age_t)
#'
#' Example 2 - with survival data
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>%
#'   slice(1:312) %>%
#'   select(time, status, age, edema, bili, albumin, protime) %>%
#'   mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'     protime = log(protime))
#' ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'
#' Example 3 - in a Shiny app
#' library(shiny)
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>% slice(1:312) %>%
#'       select(time, status, age, edema, bili, albumin, protime) %>%
#'       mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'         protime = log(protime))
#' shinyApp(
#'   ui = ihazrOutput("test"),
#'   server = function(input, output) {
#'     output$test <- renderIhazr(
#'       ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'       )
#'   }
#' )
#' @export
ihazr <- function(time, status, marker, width = NULL, height = NULL) {
  # forward options using x
    x <- data.frame(
      time = time,
      status = status
    )
    x <- cbind(x, marker)
    x <- x[order(x$time), ]
  # create widget
  htmlwidgets::createWidget(
    name = 'ihazr',
    x,
    width = width,
    height = height,
    # attempt to fix viewer window in RStudio
    sizingPolicy = htmlwidgets::sizingPolicy(
      viewer.suppress = TRUE
    ),
    package = 'ihazr'
  )
}

#' Widget output function for use in Shiny
#' @export
ihazrOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'ihazr', width, height, package = 'ihazr')
}

#' Widget render function for use in Shiny
#' @export
renderIhazr <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, ihazrOutput, env, quoted = TRUE)
}
