# Visualizing Citation

A web application that can search for bibliographic data, plotting them into a network graph, and provides useful tools for users to analyze the data. This was made as part of a thesis project to help people dive deeper into the connections between ten and thousands of research papers.

## Functionalities

You can:
- Pick any DOI and put it in the search bar, the application will fetch all the related research papers that cited it and plot them into a graph
- Plot co-authorship graph, and multiple other graphs in one application
- All data fetch from the API can be exported, and vice versa, data can be imported (graph data and API data) to the application to resume work
- Show statistics of the network 

### Use Cases

It can be used for:
- Baisc literature review
- Detecting a author who keeps citing himself
- Detecting two authors who keep citing each other
- Identifying key (popular) author and research paper
- Timeline analysis of how something is developing through out many years through the different published research papers
- Finding connections between two papers

## Demo
Watch this youtube video:
https://youtu.be/ghlLwppv3Js

## Full thesis
https://drive.google.com/file/d/1gDL9pqExYTK0m-LSQmK8sTfhEAbpzv4B/view?usp=sharing

## Techstack
- AngularJS + VisJS
- OpenCitations API, Crossref API
