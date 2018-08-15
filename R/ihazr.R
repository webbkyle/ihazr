#' ihazr
#'
#' \code{ihazr} interactively updates hazard function for survival anaylisis.
#' Allows the user to choose subsections of their data.
#'
#' @import htmlwidgets
#' @param time A numerical vector of time data.
#' @param status A binary vector representing event reached or not reached.
#' @param marker A collection of numerical variables of interest for survival
#'   analysis.
#' @param width The width of the html widget. The default is NULL, which results
#'   in intelligent automatic sizing based on the widget's container.
#' @param height The height of the html widget. The default is NULL, which
#'   results in intelligent automatic sizing based on the widget's container.
#' @return The ihazr of \code{time} and \code{status} and \code{marker}
#' @example ihazr(time, status, marker)
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
