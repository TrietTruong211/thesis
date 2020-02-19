import { Component, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { reject } from 'q';
declare var $: any;
declare var vis: any;
// declare var queue: Array<string>;
let queue = []; //queue for which DOI is being processed
let node_id = []; //contains all unique DOI as id of each node
let alldata: IHash = {}; //hash from node_id to all data of that DOI
let mapping: IHash = {}; //mapping between nodes in the graph
let grouping_key = []; //contains all group ids
let grouping_map: IHash = {}; //mapping from group id to list of DOI belong to that group
let display_bools: IHash = {}; //boolean decide if a DOI result is displayed
let data_ready = false;
let current_network; //the network element
let total_items = "";
let group_legend = {};
// search service to get 
@Injectable()
export class SearchService {
  apiRoot: string = 'https://opencitations.net/index/coci/api/v1/metadata';

  quota = 300;
  counter = 0;

  constructor(private httpclient: HttpClient) {

  }

  begin_search(DOI: HTMLInputElement) {
    queue.push(DOI.value);
    this.process_queue();
    // console.log(queue);
  }

  process_queue() {
    console.log("Process queue running");
    if (queue.length != 0 && this.counter < this.quota) {
      while (queue.length != 0 && this.counter < this.quota) {
        var current_DOI = queue.pop();
        this.counter += 1;
        this.process_DOI(current_DOI).then(() => {
          // console.log("Loop ran");
          this.process_queue();
        });
      }
    } else {
      console.log("DONE");
      data_ready = true;
    }
  }

  process_DOI(DOI: string) {
    console.log("Process DOI running");
    let promise = new Promise((resolve, reject) => {
      let apiURL = `${this.apiRoot}/${DOI}`;
      this.httpclient.get(apiURL)
      .toPromise()
      .then(
        response => {
          if (response[0]) {
            // console.log(response[0]);
            if (alldata[DOI] == null) {
              alldata[DOI] = response[0];
            }
            if (mapping[DOI] == null) {
              mapping[DOI] = [];
              node_id.push(DOI);
            }
            if (response[0].citation.length != 0) {
              var citations = response[0].citation.split(';');
              for (let i of citations) {
                i = i.replace(/\s/g, '');
                queue.push(i);
                mapping[DOI].push(i);
              }
            }
          }
          resolve();
          (error) => {
            console.log(error);
          }
        },
        msg => {
          reject();
        }
      )
      .catch(
        (error) => {
          console.log(error);
        }
      );
    });
    console.log("Process DOI done");
    return promise;
  }

}

export interface IHash {
  [details: string]: any;
}

export interface SearchResult {
  title: string;
  DOI: string;
  reference_number: number;

}

@Injectable()
export class PlottingService {
  constructor(private service: SearchService) {}

  doSearch(DOI: HTMLInputElement) {
    this.service.begin_search(DOI);
  }
          
  getString(dataTuple: any) {
    let res = '';
    res = res + 'DOI:' + dataTuple.doi + '<br/>';
    res = res + 'Title:' + dataTuple.title + '<br/>';
    res = res + 'Author:' + dataTuple.author + '<br/>';
    res = res + 'Volume:' + dataTuple.volume + '<br/>';
    res = res + 'Year:' + dataTuple.year + '<br/>';
    return res;
  }

  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    return '#' + ('000000' + color).slice(-6);
  }

  plot_graph(sortingOption: string, nodesOption: number, colorOption: string) {
    console.log('Starting to plot with options: ' + sortingOption + " " + nodesOption + " " + colorOption);
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet([]);
    // console.log(alldata);

    //Adding nodes and edges
    var node_counter = 0;
    for (let i of node_id) {
      var group_name = this.get_group(i, sortingOption);
      nodes.add({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + Math.floor(alldata[i].year / 5), group: group_name});
      if (grouping_map[group_name] == null) {
        grouping_key.push(group_name);
        grouping_map[group_name] = [];
        group_legend[group_name] = {color: this.getRandomColor()};
      }
      grouping_map[group_name].push(alldata[i].doi);
      for (let j of mapping[i]) {
        edges.add({from: i, to: j});
      }
      display_bools[i] = true;
      node_counter++;
      if (node_counter > nodesOption) break;
    }

    //Counting total items
    total_items = nodes.length + " items (" + grouping_key.length + " groups)";

    
    var container = document.getElementById('mynetwork');

    //Adding legends
    var x = -container.clientWidth/2;
    var y = -container.clientHeight/2;
    var step = 70;
    var legend_counter = 0;
    // for (let group of grouping_key) {
    //   nodes.add({
    //     id: group,
    //     x: x,
    //     y: y + step * legend_counter,
    //     label: group,
    //     group: group,
    //     fixed: true,
    //     physics: false
    //   });
    //   legend_counter++;
    // }
    
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {
      nodes: {
        shape: "dot",
        scaling: {
          min: 1,
          max: 1
        },
        font: {
          size: 12,
          face: "Tahoma"
        },
        size: 16
      },
      // edges: {
      //   color: { inherit: true },
      //   width: 1,
      //   smooth: {
      //     type: "continuous"
      //   }
      // },
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -26,
          centralGravity: 0.005,
          springLength: 230,
          springConstant: 0.18
        },
        maxVelocity: 146,
        solver: "forceAtlas2Based",
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      layout: {
        randomSeed: undefined,
        improvedLayout: true,
        clusterThreshold: 150,
        // hierarchical: {
        //   enabled:false,
        //   levelSeparation: 150,
        //   nodeSpacing: 100,
        //   treeSpacing: 200,
        //   blockShifting: true,
        //   edgeMinimization: true,
        //   parentCentralization: true,
        //   direction: 'UD',
        //   sortMethod: 'hubsize',
        //   shakeTowards: 'nodeSpacing'
        // }
      },
      groups: group_legend
    };
    var anotherOption = {
      joinCondition: function(nodeOptions) {
        return nodeOptions.group === 399;
      }
    }
    var network = new vis.Network(container, data, options);
    current_network = network;
    // network.clustering.clusterByConnection(node_id[0], anotherOption);
  }

  // plot_graph_options(sortingOption: string, nodesOption: number, colorOption: string) {
  //   console.log('Starting to plot with options');
  //   console.log('Sorting:' + sortingOption);
  //   console.log('Number of nodes:' + nodesOption);
    
  //   var nodes = new vis.DataSet();
  //   var edges = new vis.DataSet([]);
  //   // console.log(alldata);

  //   var nodeCounter = 0;
  //   for (let i of node_id) {
  //     nodes.add({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + Math.floor(alldata[i].year / 5), group: this.get_group(i, sortingOption)});
  //     if (grouping_map[this.get_group(i, sortingOption)] == null) {
  //       grouping_key.push(this.get_group(i, sortingOption));
  //       grouping_map[this.get_group(i, sortingOption)] = [];
  //       grouping_map[this.get_group(i, sortingOption)].push(alldata[i].doi);
  //     } else {
  //       grouping_map[this.get_group(i, sortingOption)].push(alldata[i].doi);
  //     }
  //     for (let j of mapping[i]) {
  //       edges.add({from: i, to: j});
  //     }

  //     nodeCounter++;

  //     if (nodeCounter == nodesOption) break;
  //   }

  //   var container = document.getElementById('mynetwork');
  //   var data = {
  //     nodes: nodes,
  //     edges: edges
  //   };
  //   var options = {
  //     nodes: {
  //       shape: "dot",
  //       scaling: {
  //         min: 1,
  //         max: 1
  //       },
  //       font: {
  //         size: 12,
  //         face: "Tahoma"
  //       }
  //     },
  //     edges: {
  //       color: { inherit: true },
  //       width: 1,
  //       smooth: {
  //         type: "continuous"
  //       }
  //     },
  //     physics: {
  //       forceAtlas2Based: {
  //         gravitationalConstant: -16,
  //         centralGravity: 0.005,
  //         springLength: 230,
  //         springConstant: 0.18
  //       },
  //       maxVelocity: 146,
  //       solver: "forceAtlas2Based",
  //       timestep: 0.35,
  //       stabilization: { iterations: 150 }
  //     },
  //     layout: {
  //       randomSeed: undefined,
  //       improvedLayout: true,
  //       clusterThreshold: 150,
  //       // hierarchical: {
  //       //   enabled:false,
  //       //   levelSeparation: 150,
  //       //   nodeSpacing: 100,
  //       //   treeSpacing: 200,
  //       //   blockShifting: true,
  //       //   edgeMinimization: true,
  //       //   parentCentralization: true,
  //       //   direction: 'UD',
  //       //   sortMethod: 'hubsize',
  //       //   shakeTowards: 'nodeSpacing'
  //       // }
  //     }
  //   };
  //   var anotherOption = {
  //     joinCondition: function(nodeOptions) {
  //       return nodeOptions.group === 399;
  //     }
  //   }
  //   var network = new vis.Network(container, data, options);    
  //   // network.clustering.clusterByConnection(node_id[0], anotherOption);
  // }

  get_group(index: number, selection: String) {
    switch(selection) {
      case "publishTime": 
        if (alldata[index].year == '') return "Undefined";
        return Math.floor(alldata[index].year / 5) * 5 + "-" + (Math.floor(alldata[index].year / 5) * 5 + 4);
      case "noOfCitation":
        return alldata[index].citation_count;
      case "author":
        return alldata[index].author;
      case "publisher":
        return alldata[index].publisher;
      default:
        return null;
    }
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  constructor(private plottingService: PlottingService) {}

  dataSortingOptions = [
    {value: 'publishTime', viewValue: 'Publish Time'},
    {value: 'noOfCitation', viewValue: 'Popularity'},
    {value: 'author', viewValue: 'Author'},
    {value: 'publisher', viewValue: 'Publisher'},
    {value: 'affiliation', viewValue: 'Affiliation'}
  ]

  noOfNodes = [
    {value: 10, viewValue: '10'},
    {value: 50, viewValue: '50'},
    {value: 100, viewValue: '100'},
    {value: 300, viewValue: '300'}
  ]

  colorOptions = [
    {value: 'default', viewValue: 'Default'},
    {value: 'customize', viewValue: 'Customize'}
  ]

  sortingOption = "publishTime";
  nodesOption = 300;
  colorOption = "default";

  content_ready = false;
  statistic = "";

  // searchDOI(title: HTMLInputElement) {
    //   this.httpClient.get(`https://api.crossref.org/works?filter=has-full-text:true&mailto=centory98@gmail.com&query.title=${title.value}`)
    //   .subscribe(response => {
      //     console.log(response);
      //     this.result = response['message']['items'];
      //     console.log(this.result);
      //   });
      // }
          
  doSearch(DOI: HTMLInputElement) {
    this.plottingService.doSearch(DOI);
  }

  plot_graph(sortingOption: string, nodesOption: number, colorOption: string) {
    // this.plottingService.plot_graph("publishTime");
    this.plottingService.plot_graph(sortingOption, nodesOption, colorOption);
    this.statistic = total_items;
    this.content_ready = true;
  }

  select_node(nodeId: string) {
    current_network.selectNodes([nodeId]);
    // current_network.showPopup(nodeId);
    var options = {
      scale: 1.0,
      offset: { x: 0, y: 0 },
      animation: {
        duration: 1000,
        easingFunction: "easeInOutQuad"
      }
    };
    current_network.focus(nodeId, options);
  }

  open_new_tab(DOI: string) {
    var url = 'https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=';
    url+=DOI;
    url+='&btnG=';
    window.open(url,'_blank');
  }

  select_group_node(groupId: string) {
    var list = [];
    grouping_map[groupId].forEach(element => {
      list.push(element);
    });
    current_network.selectNodes(list);
  }

  get_node_id() {
    return node_id;
  }

  get_data(DOI: string) {
    return alldata[DOI];
  }

  get_grouping_key() {
    grouping_key.sort();
    return grouping_key;
  }

  get_grouping_result(key: string) {
    var newGroupingResult = []
    for (let doi of grouping_map[key]) {
      if (display_bools[doi]) newGroupingResult.push(doi);
    }
    // return grouping_map[key];
    return newGroupingResult;
  }

  get_data_status() {
    return data_ready;
  }

  get_display_permission(DOI: string) {
    return display_bools[DOI];
  }

  onKey(event) {
    console.log(event.target.value);
    for (let doi of node_id) {
      if (!doi.includes(event.target.value) && !alldata[doi].title.includes(event.target.value)) {
        display_bools[doi] = false;
      } else {
        display_bools[doi] = true;
      }
    }
  }

  check_group_display_permission(key: string) {
    for (let doi of grouping_map[key]) {
      if (display_bools[doi]) return true;
    }
    return false;
  }

  get_group_color(group: string) {
    return group_legend[group].color;
  }
  
}


// var nodes = [
    //   { id: 0, label: "Myriel", group: 1 },
    //   { id: 1, label: "Napoleon", group: 1 },
    //   { id: 2, label: "Mlle.Baptistine", group: 1 },
    //   { id: 3, label: "Mme.Magloire", group: 1 },
    //   { id: 4, label: "CountessdeLo", group: 1 },
    //   { id: 5, label: "Geborand", group: 1 },
    //   { id: 6, label: "Champtercier", group: 1 },
    //   { id: 7, label: "Cravatte", group: 1 },
    //   { id: 8, label: "Count", group: 1 },
    //   { id: 9, label: "OldMan", group: 1 },
    //   { id: 10, label: "Labarre", group: 2 },
    //   { id: 11, label: "Valjean", group: 2 },
    //   { id: 12, label: "Marguerite", group: 3 },
    //   { id: 13, label: "Mme.deR", group: 2 },
    //   { id: 14, label: "Isabeau", group: 2 },
    //   { id: 15, label: "Gervais", group: 2 },
    //   { id: 16, label: "Tholomyes", group: 3 },
    //   { id: 17, label: "Listolier", group: 3 },
    //   { id: 18, label: "Fameuil", group: 3 },
    //   { id: 19, label: "Blacheville", group: 3 },
    //   { id: 20, label: "Favourite", group: 3 },
    //   { id: 21, label: "Dahlia", group: 3 },
    //   { id: 22, label: "Zephine", group: 3 },
    //   { id: 23, label: "Fantine", group: 3 },
    //   { id: 24, label: "Mme.Thenardier", group: 4 },
    //   { id: 25, label: "Thenardier", group: 4 },
    //   { id: 26, label: "Cosette", group: 5 },
    //   { id: 27, label: "Javert", group: 4 },
    //   { id: 28, label: "Fauchelevent", group: 0 },
    //   { id: 29, label: "Bamatabois", group: 2 },
    //   { id: 30, label: "Perpetue", group: 3 },
    //   { id: 31, label: "Simplice", group: 2 },
    //   { id: 32, label: "Scaufflaire", group: 2 },
    //   { id: 33, label: "Woman1", group: 2 },
    //   { id: 34, label: "Judge", group: 2 },
    //   { id: 35, label: "Champmathieu", group: 2 },
    //   { id: 36, label: "Brevet", group: 2 },
    //   { id: 37, label: "Chenildieu", group: 2 },
    //   { id: 38, label: "Cochepaille", group: 2 },
    //   { id: 39, label: "Pontmercy", group: 4 },
    //   { id: 40, label: "Boulatruelle", group: 6 },
    //   { id: 41, label: "Eponine", group: 4 },
    //   { id: 42, label: "Anzelma", group: 4 },
    //   { id: 43, label: "Woman2", group: 5 },
    //   { id: 44, label: "MotherInnocent", group: 0 },
    //   { id: 45, label: "Gribier", group: 0 },
    //   { id: 46, label: "Jondrette", group: 7 },
    //   { id: 47, label: "Mme.Burgon", group: 7 },
    //   { id: 48, label: "Gavroche", group: 8 },
    //   { id: 49, label: "Gillenormand", group: 5 },
    //   { id: 50, label: "Magnon", group: 5 },
    //   { id: 51, label: "Mlle.Gillenormand", group: 5 },
    //   { id: 52, label: "Mme.Pontmercy", group: 5 },
    //   { id: 53, label: "Mlle.Vaubois", group: 5 },
    //   { id: 54, label: "Lt.Gillenormand", group: 5 },
    //   { id: 55, label: "Marius", group: 8 },
    //   { id: 56, label: "BaronessT", group: 5 },
    //   { id: 57, label: "Mabeuf", group: 8 },
    //   { id: 58, label: "Enjolras", group: 8 },
    //   { id: 59, label: "Combeferre", group: 8 },
    //   { id: 60, label: "Prouvaire", group: 8 },
    //   { id: 61, label: "Feuilly", group: 8 },
    //   { id: 62, label: "Courfeyrac", group: 8 },
    //   { id: 63, label: "Bahorel", group: 8 },
    //   { id: 64, label: "Bossuet", group: 8 },
    //   { id: 65, label: "Joly", group: 8 },
    //   { id: 66, label: "Grantaire", group: 8 },
    //   { id: 67, label: "MotherPlutarch", group: 9 },
    //   { id: 68, label: "Gueulemer", group: 4 },
    //   { id: 69, label: "Babet", group: 4 },
    //   { id: 70, label: "Claquesous", group: 4 },
    //   { id: 71, label: "Montparnasse", group: 4 },
    //   { id: 72, label: "Toussaint", group: 5 },
    //   { id: 73, label: "Child1", group: 10 },
    //   { id: 74, label: "Child2", group: 10 },
    //   { id: 75, label: "Brujon", group: 4 },
    //   { id: 76, label: "Mme.Hucheloup", group: 8 }
    // ];
  
    // // create some edges
    // var edges = [
    //   { from: 1, to: 0 },
    //   { from: 2, to: 0 },
    //   { from: 3, to: 0 },
    //   { from: 3, to: 2 },
    //   { from: 4, to: 0 },
    //   { from: 5, to: 0 },
    //   { from: 6, to: 0 },
    //   { from: 7, to: 0 },
    //   { from: 8, to: 0 },
    //   { from: 9, to: 0 },
    //   { from: 11, to: 10 },
    //   { from: 11, to: 3 },
    //   { from: 11, to: 2 },
    //   { from: 11, to: 0 },
    //   { from: 12, to: 11 },
    //   { from: 13, to: 11 },
    //   { from: 14, to: 11 },
    //   { from: 15, to: 11 },
    //   { from: 17, to: 16 },
    //   { from: 18, to: 16 },
    //   { from: 18, to: 17 },
    //   { from: 19, to: 16 },
    //   { from: 19, to: 17 },
    //   { from: 19, to: 18 },
    //   { from: 20, to: 16 },
    //   { from: 20, to: 17 },
    //   { from: 20, to: 18 },
    //   { from: 20, to: 19 },
    //   { from: 21, to: 16 },
    //   { from: 21, to: 17 },
    //   { from: 21, to: 18 },
    //   { from: 21, to: 19 },
    //   { from: 21, to: 20 },
    //   { from: 22, to: 16 },
    //   { from: 22, to: 17 },
    //   { from: 22, to: 18 },
    //   { from: 22, to: 19 },
    //   { from: 22, to: 20 },
    //   { from: 22, to: 21 },
    //   { from: 23, to: 16 },
    //   { from: 23, to: 17 },
    //   { from: 23, to: 18 },
    //   { from: 23, to: 19 },
    //   { from: 23, to: 20 },
    //   { from: 23, to: 21 },
    //   { from: 23, to: 22 },
    //   { from: 23, to: 12 },
    //   { from: 23, to: 11 },
    //   { from: 24, to: 23 },
    //   { from: 24, to: 11 },
    //   { from: 25, to: 24 },
    //   { from: 25, to: 23 },
    //   { from: 25, to: 11 },
    //   { from: 26, to: 24 },
    //   { from: 26, to: 11 },
    //   { from: 26, to: 16 },
    //   { from: 26, to: 25 },
    //   { from: 27, to: 11 },
    //   { from: 27, to: 23 },
    //   { from: 27, to: 25 },
    //   { from: 27, to: 24 },
    //   { from: 27, to: 26 },
    //   { from: 28, to: 11 },
    //   { from: 28, to: 27 },
    //   { from: 29, to: 23 },
    //   { from: 29, to: 27 },
    //   { from: 29, to: 11 },
    //   { from: 30, to: 23 },
    //   { from: 31, to: 30 },
    //   { from: 31, to: 11 },
    //   { from: 31, to: 23 },
    //   { from: 31, to: 27 },
    //   { from: 32, to: 11 },
    //   { from: 33, to: 11 },
    //   { from: 33, to: 27 },
    //   { from: 34, to: 11 },
    //   { from: 34, to: 29 },
    //   { from: 35, to: 11 },
    //   { from: 35, to: 34 },
    //   { from: 35, to: 29 },
    //   { from: 36, to: 34 },
    //   { from: 36, to: 35 },
    //   { from: 36, to: 11 },
    //   { from: 36, to: 29 },
    //   { from: 37, to: 34 },
    //   { from: 37, to: 35 },
    //   { from: 37, to: 36 },
    //   { from: 37, to: 11 },
    //   { from: 37, to: 29 },
    //   { from: 38, to: 34 },
    //   { from: 38, to: 35 },
    //   { from: 38, to: 36 },
    //   { from: 38, to: 37 },
    //   { from: 38, to: 11 },
    //   { from: 38, to: 29 },
    //   { from: 39, to: 25 },
    //   { from: 40, to: 25 },
    //   { from: 41, to: 24 },
    //   { from: 41, to: 25 },
    //   { from: 42, to: 41 },
    //   { from: 42, to: 25 },
    //   { from: 42, to: 24 },
    //   { from: 43, to: 11 },
    //   { from: 43, to: 26 },
    //   { from: 43, to: 27 },
    //   { from: 44, to: 28 },
    //   { from: 44, to: 11 },
    //   { from: 45, to: 28 },
    //   { from: 47, to: 46 },
    //   { from: 48, to: 47 },
    //   { from: 48, to: 25 },
    //   { from: 48, to: 27 },
    //   { from: 48, to: 11 },
    //   { from: 49, to: 26 },
    //   { from: 49, to: 11 },
    //   { from: 50, to: 49 },
    //   { from: 50, to: 24 },
    //   { from: 51, to: 49 },
    //   { from: 51, to: 26 },
    //   { from: 51, to: 11 },
    //   { from: 52, to: 51 },
    //   { from: 52, to: 39 },
    //   { from: 53, to: 51 },
    //   { from: 54, to: 51 },
    //   { from: 54, to: 49 },
    //   { from: 54, to: 26 },
    //   { from: 55, to: 51 },
    //   { from: 55, to: 49 },
    //   { from: 55, to: 39 },
    //   { from: 55, to: 54 },
    //   { from: 55, to: 26 },
    //   { from: 55, to: 11 },
    //   { from: 55, to: 16 },
    //   { from: 55, to: 25 },
    //   { from: 55, to: 41 },
    //   { from: 55, to: 48 },
    //   { from: 56, to: 49 },
    //   { from: 56, to: 55 },
    //   { from: 57, to: 55 },
    //   { from: 57, to: 41 },
    //   { from: 57, to: 48 },
    //   { from: 58, to: 55 },
    //   { from: 58, to: 48 },
    //   { from: 58, to: 27 },
    //   { from: 58, to: 57 },
    //   { from: 58, to: 11 },
    //   { from: 59, to: 58 },
    //   { from: 59, to: 55 },
    //   { from: 59, to: 48 },
    //   { from: 59, to: 57 },
    //   { from: 60, to: 48 },
    //   { from: 60, to: 58 },
    //   { from: 60, to: 59 },
    //   { from: 61, to: 48 },
    //   { from: 61, to: 58 },
    //   { from: 61, to: 60 },
    //   { from: 61, to: 59 },
    //   { from: 61, to: 57 },
    //   { from: 61, to: 55 },
    //   { from: 62, to: 55 },
    //   { from: 62, to: 58 },
    //   { from: 62, to: 59 },
    //   { from: 62, to: 48 },
    //   { from: 62, to: 57 },
    //   { from: 62, to: 41 },
    //   { from: 62, to: 61 },
    //   { from: 62, to: 60 },
    //   { from: 63, to: 59 },
    //   { from: 63, to: 48 },
    //   { from: 63, to: 62 },
    //   { from: 63, to: 57 },
    //   { from: 63, to: 58 },
    //   { from: 63, to: 61 },
    //   { from: 63, to: 60 },
    //   { from: 63, to: 55 },
    //   { from: 64, to: 55 },
    //   { from: 64, to: 62 },
    //   { from: 64, to: 48 },
    //   { from: 64, to: 63 },
    //   { from: 64, to: 58 },
    //   { from: 64, to: 61 },
    //   { from: 64, to: 60 },
    //   { from: 64, to: 59 },
    //   { from: 64, to: 57 },
    //   { from: 64, to: 11 },
    //   { from: 65, to: 63 },
    //   { from: 65, to: 64 },
    //   { from: 65, to: 48 },
    //   { from: 65, to: 62 },
    //   { from: 65, to: 58 },
    //   { from: 65, to: 61 },
    //   { from: 65, to: 60 },
    //   { from: 65, to: 59 },
    //   { from: 65, to: 57 },
    //   { from: 65, to: 55 },
    //   { from: 66, to: 64 },
    //   { from: 66, to: 58 },
    //   { from: 66, to: 59 },
    //   { from: 66, to: 62 },
    //   { from: 66, to: 65 },
    //   { from: 66, to: 48 },
    //   { from: 66, to: 63 },
    //   { from: 66, to: 61 },
    //   { from: 66, to: 60 },
    //   { from: 67, to: 57 },
    //   { from: 68, to: 25 },
    //   { from: 68, to: 11 },
    //   { from: 68, to: 24 },
    //   { from: 68, to: 27 },
    //   { from: 68, to: 48 },
    //   { from: 68, to: 41 },
    //   { from: 69, to: 25 },
    //   { from: 69, to: 68 },
    //   { from: 69, to: 11 },
    //   { from: 69, to: 24 },
    //   { from: 69, to: 27 },
    //   { from: 69, to: 48 },
    //   { from: 69, to: 41 },
    //   { from: 70, to: 25 },
    //   { from: 70, to: 69 },
    //   { from: 70, to: 68 },
    //   { from: 70, to: 11 },
    //   { from: 70, to: 24 },
    //   { from: 70, to: 27 },
    //   { from: 70, to: 41 },
    //   { from: 70, to: 58 },
    //   { from: 71, to: 27 },
    //   { from: 71, to: 69 },
    //   { from: 71, to: 68 },
    //   { from: 71, to: 70 },
    //   { from: 71, to: 11 },
    //   { from: 71, to: 48 },
    //   { from: 71, to: 41 },
    //   { from: 71, to: 25 },
    //   { from: 72, to: 26 },
    //   { from: 72, to: 27 },
    //   { from: 72, to: 11 },
    //   { from: 73, to: 48 },
    //   { from: 74, to: 48 },
    //   { from: 74, to: 73 },
    //   { from: 75, to: 69 },
    //   { from: 75, to: 68 },
    //   { from: 75, to: 25 },
    //   { from: 75, to: 48 },
    //   { from: 75, to: 41 },
    //   { from: 75, to: 70 },
    //   { from: 75, to: 71 },
    //   { from: 76, to: 64 },
    //   { from: 76, to: 65 },
    //   { from: 76, to: 66 },
    //   { from: 76, to: 63 },
    //   { from: 76, to: 62 },
    //   { from: 76, to: 48 },
    //   { from: 76, to: 58 }
    // ];