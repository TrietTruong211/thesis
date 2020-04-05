import { Component, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {FormControl} from '@angular/forms';
import { reject } from 'q';
declare var $: any;
declare var vis: any;

let queue = []; //queue for which DOI is being processed
let node_id = []; //contains all unique DOI as id of each node
let node_id_author = []; //contains all unique author (full name)
let author_to_doi_pointer: IHash = {}; //map from author name to list of DOI contains that author
let alldata: IHash = {}; //hash from node_id to all data of that DOI from opencitation
let alldata_crossref: IHash = {}; //hash from node_id to all data from crossref api
let data_ready = false; //boolean decide if data is successfully retrieved
let mapping: IHash = {}; //all mapping between nodes in the graph

// let grouping_key = []; //contains all group ids
// let grouping_map: IHash = {}; //mapping from group id to list of DOI belong to that group
// let display_bools: IHash = {}; //boolean decide if a DOI resul is displayed
// let total_items = ""; //to be displayed
// let group_legend = {};
// let graph_data = {};
// let current_network;


// All variables to keep track of current variables for display
// let current_grouping_key = []; //contains all group ids
// let current_grouping_map: IHash = {}; //mapping from group id to list of DOI belong to that group
// let current_display_bools: IHash = {}; //boolean decide if a DOI resul is displayed
// let current_total_items = ""; //to be displayed
// let current_group_legend = {};
// let current_graph_data = {};
// let current_network;

//Contains all data used to plot
let all_grouping_key: IHash = {}; //contains mapping from tab to all group ids
let all_grouping_map: IHash = {}; //contains mapping from tab to [a mapping from group id to list of DOI belong to that group]
let all_display_bools: IHash = {}; //contains mapping from tab to [a mapping from boolean decide if a DOI result is displayed]
let all_total_items: IHash = {}; //contains mapping from tab to total items of current grouping result
let all_group_legend: IHash = {}; //contains mapping from tab to group legend
let all_graph_data: IHash = {}; //contains mapping from tab to the graph data of that tab
let all_network: IHash = {}; //contains mapping from tab to the network of that tab




export interface IHash {
  [details: string]: any;
}




// search service to get 
@Injectable()
export class SearchService {
  apiRoot: string = 'https://opencitations.net/index/coci/api/v1/metadata';
  apiRoot2: string = 'https://api.crossref.org/works';

  quota = 10;
  counter = 0;
  pending_results = 0;

  constructor(private httpclient: HttpClient) {

  }

  begin_search(DOI: HTMLInputElement) {
    queue.push(DOI.value);
    this.process_queue();
    // console.log(queue);
  }

  process_queue() {
    if (queue.length != 0 && this.counter < this.quota) {
      console.log("Process queue running");
      while (queue.length != 0 && this.counter < this.quota) {
        var current_DOI = queue.pop();
        this.counter += 1;
        this.pending_results += 2;
        this.process_DOI(current_DOI).then(() => {
          this.process_queue();
        });
        this.process_DOI_next(current_DOI).then(() => {
          this.process_queue();
        });
      }
    } else {
      if (this.pending_results == 0) {
        if (!data_ready) {
          console.log("DONE");
          data_ready = true;
          console.log(node_id_author);
          console.log(author_to_doi_pointer);
        }
      }
    }
  }

  process_DOI(DOI: string) {
    if (this.counter > this.quota) return null;
    console.log("Getting data " + DOI + " - Opencitation");
    console.log(this.counter +"/"+this.quota);
    let promise = new Promise((resolve, reject) => {
      let apiURL = `${this.apiRoot}/${DOI}`;
      this.httpclient.get(apiURL)
      .toPromise()
      .then(
        response => {
          // console.log(response[0]);
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
                if (mapping[DOI].indexOf(i) < 0){
                  mapping[DOI].push(i);
                }
              }
            }
          }
          resolve();
          (error) => {
            console.log(error);
            console.log("Ooops");
          }
          this.pending_results -= 1;
        },
        msg => {
          reject();
        }
      )
      .catch(
        (error) => {
          console.log(error);
          console.log("Ooops catch an error");
        }
      );
    });
    console.log("Retrieved data  " + DOI + " - Openciataion");
    return promise;
    // return this.process_DOI_next(DOI);
  }

  process_DOI_next(DOI: string) {
    if (this.counter > this.quota) return null;
    console.log("Getting data of " + DOI + " - Crossref");
    let promise = new Promise((resolve, reject) => {
      let apiURL = `${this.apiRoot2}/${DOI}`;
      this.httpclient.get(apiURL)
      .toPromise()
      .then(
        response => {
          // console.log(response["message"]["items"][0]);
          if (response != undefined) {
            if (alldata_crossref[DOI] == null) {
              alldata_crossref[DOI] = response["message"];
              this.process_author(DOI);
              // console.log(alldata_crossref[DOI]);
            }
          } else {
            console.log("DOI " + DOI + " has problem");
          }
          resolve();
          (error) => {
            console.log(error);
            console.log("Ooops");
          }
          this.pending_results -= 1;
        },
        msg => {
          reject();
        }
      )
      .catch(
        (error) => {
          console.log(error);
          console.log("Ooops catch an error");
        }
      );
    });
    console.log("Retrieved data " + DOI + " - Crossref");
    return promise;
  }

  process_author(DOI: string) {
    for (let author of alldata_crossref[DOI].author) {
      let fullname = this.get_full_name(author); 
      if (node_id_author.indexOf(fullname) <= -1) {
        node_id_author.push(fullname);
      }
      if (author_to_doi_pointer[fullname] == null) {
        author_to_doi_pointer[fullname] = [];
      }
      author_to_doi_pointer[fullname].push(DOI);
    }
  }

  get_full_name(author: any) {
    return author.given + " " + author.family;
  }
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

  getStringAuthor(fullname: any) {
    let res = '';
    res = res + 'Name:' + fullname + '<br/>';

    res = res + 'Worked on:';
    for (let doi of author_to_doi_pointer[fullname]) {
      res = res + doi + ';'
    }
    res = res + '<br/>';
    return res;
  }

  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    return '#' + ('000000' + color).slice(-6);
  }

  get_full_name(author: any) {
    return author.given + " " + author.family;
  }

  plot_graph(mainData: string, sortingOption: string, nodesOption: number, colorOption: string, seed: string, tabName: string) {
    console.log('Starting to plot with options: ' + sortingOption + " " + nodesOption + " " + colorOption + " " + seed +" at tab:" + tabName);
    var nodes = [];
    var edges = [];

    all_grouping_key[tabName] = [];
    all_grouping_map[tabName] = {};

    if (mainData == 'author' || tabName != 'mynetwork') {
      for (let author_name of node_id_author) {
        nodes.push({id: author_name, label: '', title: this.getStringAuthor(author_name)});
      }
      for (let doi of node_id) {
        for (let author of alldata_crossref[doi].author) {
          for (let author2 of alldata_crossref[doi].author) {
            let fullname1 = this.get_full_name(author);
            let fullname2 = this.get_full_name(author2);
            if (author != author2 && edges.indexOf({from: fullname2, to: fullname1}) <= -1
            && edges.indexOf({from: fullname1, to: fullname2}) <= -1) 
              edges.push({from: fullname1, to: fullname2});
          }
        }
      }
    } else {
      //Adding nodes and edges
      var node_counter = 0;
      for (let i of node_id) {
        var group_name = this.get_group(i, sortingOption);
        nodes.push({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + sortingOption + group_name, 
        group: group_name});
        if (all_grouping_map[tabName][group_name] == null) {
          all_grouping_key[tabName].push(group_name);
          all_grouping_map[tabName][group_name] = [];
          all_group_legend[tabName][group_name] = {color: this.getRandomColor()};
        }
        all_grouping_map[tabName][group_name].push(alldata[i].doi);
        for (let j of mapping[i]) {
          edges.push({id: i+"|"+j, from: i, to: j, title:"from "+i+" to "+j});
        }
        // edges.push({from: i, to: i, selfReferenceSize: 250});
        all_display_bools[tabName][i] = true;
        node_counter++;
        if (node_counter > nodesOption) break;
      }
      //Counting total items
      all_total_items[tabName] = nodes.length + " items (" + all_grouping_key[tabName].length + " groups)";
    }
    var container = document.getElementById('mynetwork');

    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };
    this.plot_this(container, data, all_group_legend[tabName], tabName);

    // nodes_global = nodes;
    // edges_global = edges;
  }

  get_group(index: string, selection: String) {
    switch(selection) {
      case "publishTime": 
        if (alldata[index].year == '') return "Undefined";
        return Math.floor(alldata[index].year / 5) * 5 + "-" + (Math.floor(alldata[index].year / 5) * 5 + 4);
      case "noOfCitation":
        var n = Math.floor(alldata[index].citation_count / 100);
        if (n > 5) return  n*100 + "+";
        return n*100 + "-" + (n + 1)*100;
      case "author":
        return alldata[index].author;
      case "publisher":
        return alldata_crossref[index].publisher;
      case "topic":
        return alldata_crossref[index]["short-container-title"][0];
      case "type":
        return alldata_crossref[index].type;
      default:
        return null;
    }
  }

  plot_imported_graph(nodes: any, edges: any, legend: any) {
    // for (let i of nodes) {
    //   var group_name = i.group;
    //   if (grouping_map[group_name] == null) {
    //     grouping_key.push(group_name);
    //     grouping_map[group_name] = [];
    //     group_legend[group_name] = {color: this.getRandomColor()};
    //   }
    //   grouping_map[group_name].push(i.id);
    //   display_bools[i.id] = true;
    // }
    // group_legend = legend;

    // var container = document.getElementById('mynetwork');

    // var data = {
    //   nodes: new vis.DataSet(nodes),
    //   edges: new vis.DataSet(edges)
    // };
    // this.plot_this(container, data, group_legend);


    // console.log(nodes);
    // console.log(JSON.stringify(nodes));
    // network.clustering.clusterByConnection(node_id[0], anotherOption);
  }

  plot_graph_author(graph_id: string, author_name: string, sortingOption: string, tabName: string) {
    var nodes = [];
    var edges = [];

    all_grouping_key[tabName] = [];
    all_grouping_map[tabName] = {};

    var doi_list = author_to_doi_pointer[author_name];
    var node_counter = 0;
    for (let i of doi_list) {
      var group_name = this.get_group(i, sortingOption);
      nodes.push({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + sortingOption + group_name, 
      group: group_name});
      if (all_grouping_map[tabName][group_name] == null) {
        all_grouping_key[tabName].push(group_name);
        all_grouping_map[tabName][group_name] = [];
        all_group_legend[tabName][group_name] = {color: this.getRandomColor()};
      }
      all_grouping_map[tabName][group_name].push(alldata[i].doi);
      for (let j of mapping[i]) {
        if (doi_list.includes(j)) {
          edges.push({id: i+"|"+j, from: i, to: j, title:"from "+i+" to "+j});
        }
      }
      all_display_bools[tabName][i] = true;
      node_counter++;
      if (node_counter > 100) break;
    }

    //Counting total items
    all_total_items[tabName] = nodes.length + " items (" + all_grouping_key[tabName].length + " groups)";


    var container = document.getElementById(graph_id);

    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    this.plot_this(container, data, all_group_legend[tabName], tabName);
    // nodes_global = nodes;
    // edges_global = edges;
  }

  plot_this(container: any, data: any, group_legend: any, tabName: string) {
    all_graph_data[tabName] = data;
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
      edges: {
        // color: { inherit: true },
        // width: 1,
        // smooth: {
        //   type: "continuous"
        // },
        selfReferenceSize: 100
      },
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
        clusterThreshold: 150
      },
      groups: group_legend
    };
    // if (+seed != 0) options.layout.randomSeed = Number(seed);
    var network = new vis.Network(container, all_graph_data[tabName], options);

    all_network[tabName] = network;
  }
}





















@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  constructor(private plottingService: PlottingService) {}

  mainDataOptions = [
    {value: 'doi', viewValue: "DOI"},
    {value: 'author', viewValue: "Author"}
  ]

  dataSortingOptions = [
    {value: 'publishTime', viewValue: 'Publish Time'},
    {value: 'noOfCitation', viewValue: 'Popularity'},
    {value: 'publisher', viewValue: 'Publisher'},
    {value: 'topic', viewValue: 'Topic'},
    {value: 'type', viewValue: 'Publish Type'}
  ]

  dataSortingOptions_author = [
    {value: 'noOfCitation', viewValue: 'Popularity'},
    {value: 'doi', viewValue: 'DOI'}
  ]

  noOfNodes = [
    {value: 10, viewValue: '10'},
    {value: 50, viewValue: '50'},
    {value: 100, viewValue: '100'},
    {value: 300, viewValue: '300'}
  ]

  colorOptions = [
    {value: 'default', viewValue: 'Random'},
    {value: 'customize', viewValue: 'Customize'}
  ]

  mainDataOption = "doi";
  sortingOption = "publishTime";
  nodesOption = 10;
  colorOption = "default";

  content_ready = false;
  statistic = "";
  seed = undefined;
  textArea = "";

  current_grouping_key = []; //contains all group ids
  current_grouping_map = {}; //mapping from group id to list of DOI belong to that group
  current_display_bools = {}; //boolean decide if a DOI resul is displayed
  current_total_items = ""; //to be displayed
  current_group_legend = {};
  current_graph_data = {};
  current_network;
          
  doSearch(DOI: HTMLInputElement) {
    document.getElementById("starting_search_button").innerHTML = "Loading..."
    this.plottingService.doSearch(DOI);
    this.updateTab();
  }

  plot_graph(mainDataOption: string, sortingOption: string, nodesOption: number, colorOption: string, seed: string) {
    this.selected_tab_name = this.tabs[this.selected.value];
    this.plottingService.plot_graph(mainDataOption,sortingOption, nodesOption, colorOption, seed, this.selected_tab_name);
    this.updateTab();
    this.statistic = this.current_total_items;
    this.content_ready = true;
  }

  select_node(nodeId: string) {
    this.current_network.selectNodes([nodeId]);
    // current_network.showPopup(nodeId);
    var options = {
      scale: 1.0,
      offset: { x: 0, y: 0 },
      animation: {
        duration: 1000,
        easingFunction: "easeInOutQuad"
      }
    };
    this.current_network.focus(nodeId, options);
  }

  open_new_tab(DOI: string) {
    var url = 'https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=';
    url+=DOI;
    url+='&btnG=';
    window.open(url,'_blank');
  }

  get_node_id() {
    return node_id;
  }
  
  get_data(DOI: string) {
    return alldata[DOI];
  }

  get_data_status() {
    return data_ready;
  }

//TO BE OPTIMIZED
  select_group_node(groupId: string) {
    var list = [];
    this.current_grouping_map[groupId].forEach(element => {
      list.push(element);
    });
    this.current_network.selectNodes(list);
  }

//TO BE OPTIMIZED
  // get_grouping_key() {
  //   this.current_grouping_key.sort();
  //   return this.current_grouping_key;
  // }
// TO BE OPTIMIZED
  get_grouping_result(key: string) {
    var newGroupingResult = []
    for (let doi of this.current_grouping_map[key]) {
      if (this.current_display_bools[doi]) newGroupingResult.push(doi);
    }
    // return grouping_map[key];
    return newGroupingResult;
  }
// TO BE OPTIMIZED
  get_display_permission(DOI: string) {
    return this.current_display_bools[DOI];
  }

//MAYBE TO BE OPTIMIZED
  onKey(event) {
    console.log(event.target.value);
    for (let doi of node_id) {
      if (!doi.includes(event.target.value) && !alldata[doi].title.includes(event.target.value)) {
        this.current_display_bools[doi] = false;
      } else {
        this.current_display_bools[doi] = true;
      }
    }
  }
// TO BE OPTIMIZED
  check_group_display_permission(key: string) {
    for (let doi of this.current_grouping_map[key]) {
      if (this.current_display_bools[doi]) return true;
    }
    return false;
  }
// TO BE OPTIMIZED
  // get_group_color(group: string) {
  //   return this.current_group_legend[group].color;
  // }
  
//Seed options
  get_seed() {
    return this.seed;
  }
  export_seed() {
    this.seed = this.current_network.getSeed();
    console.log(this.seed);
    console.log(typeof(this.current_network.getSeed()));
  }


  //Data import and export
  import_data(input_text: string) {
    console.log(input_text);
    var obj = JSON.parse('{' + input_text + '}');
    console.log(obj);
    this.plottingService.plot_imported_graph(obj.nodes, obj.edges, obj.groups);
    this.statistic = this.current_total_items;
    this.content_ready = true;
  }
  export_data() {
    this.textArea+='"nodes":' + JSON.stringify(this.current_graph_data["nodes"], undefined, 2);
    this.textArea+=','
    this.textArea+='"edges":' + JSON.stringify(this.current_graph_data["edges"], undefined, 2);
    this.textArea+=','
    this.textArea+='"groups":' + JSON.stringify(this.current_group_legend, undefined, 2);
  }

  //Sphere of influence
  sphere_influence(input_text: string) {
    console.log(input_text);
    this.current_graph_data["edges"].update({from: input_text, to: input_text, selfReferenceSize: 270});
  }

  //Find connection
  find_connection(input1: string, input2: string) {
    var list1 = this.recursive_traverse(input2, input1);
    var list2 = this.recursive_traverse(input1, input2);
    var selected_list = null;
    if (list1) {
      selected_list = list1;
    } else if (list2) {
      selected_list = list2;
    } else {
      console.log("Can't find path");
    }

    if (selected_list) {
      this.current_network.selectNodes(selected_list, false);
      var list_edge = [];
      console.log(selected_list);
      console.log(this.current_network.edges);
      for (let i = 0; i < selected_list.length - 1; i++) {
        var index = selected_list.length - 1 - i;
        var e = selected_list[index]+"|"+selected_list[index - 1];
        console.log(e);
        list_edge.push(e);
      }
      this.current_network.selectEdges(list_edge);
    }
  }
  recursive_traverse(target: string, node: string) {
    // console.log("visit " + node);
    if (node == target) {
      console.log("Found it")
      return [node];
    } 

    if (mapping[node]) {
      for (let child of mapping[node]) {
        var res = this.recursive_traverse(target, child);
        if (res) {
          res.push(node);
          return res
        } 
      }
    }
    return null;
  }


  //Tabs for multiple graphs

  tabs = ['mynetwork'];
  selected = new FormControl(0);
  selected_tab_name = this.tabs[this.selected.value];

  get_currently_selected_tab () {
    console.log(this.tabs[this.selected.value])
  }

  addTab(selectAfterAdding: boolean) {
    this.tabs.push('New');

    if (selectAfterAdding) {
      this.selected.setValue(this.tabs.length - 1);
    }
  }

  removeTab(index: number) {
    this.tabs.splice(index, 1);
  }

  getTabName(index: number) {
    return this.tabs[index];
  }

  //For author's results area
  get_author_results() {
    return node_id_author;
  }

  author_click(author_name: string) {
    console.log(author_name);
    if (!this.tabs.includes(author_name)) this.tabs.push(author_name);
    this.selected.setValue(this.tabs.length - 1);
    this.selected_tab_name = this.tabs[this.selected.value];
    this.plottingService.plot_graph_author(author_name, author_name, "publishTime", this.selected_tab_name);
  }

  updateTab() {
    console.log(this.tabs[this.selected.value])
    this.selected_tab_name = this.tabs[this.selected.value];
    console.log("Updating " + this.selected_tab_name)
    if (all_grouping_key[this.selected_tab_name] == null) {all_grouping_key[this.selected_tab_name] = []};
    if (all_grouping_map[this.selected_tab_name] == null) {all_grouping_map[this.selected_tab_name] = {}};
    if (all_display_bools[this.selected_tab_name] == null) {all_display_bools[this.selected_tab_name] = {}};
    if (all_total_items[this.selected_tab_name] == null) {all_total_items[this.selected_tab_name] = ""};
    if (all_group_legend[this.selected_tab_name] == null) {all_group_legend[this.selected_tab_name] = {}};
    if (all_graph_data[this.selected_tab_name] == null) {all_graph_data[this.selected_tab_name] = {}};

    this.current_grouping_key = all_grouping_key[this.selected_tab_name];
    this.current_grouping_key.sort();
    this.current_grouping_map = all_grouping_map[this.selected_tab_name];
    this.current_display_bools = all_display_bools[this.selected_tab_name];
    this.current_total_items = all_total_items[this.selected_tab_name];
    this.current_group_legend = all_group_legend[this.selected_tab_name];
    this.current_graph_data = all_graph_data[this.selected_tab_name];

    if (all_network[this.selected_tab_name] != null) 
    this.current_network = all_network[this.selected_tab_name];

    console.log("Tab information updated");
  }

  print_debug() {
    console.log("All values from direct variables")
    console.log(all_grouping_key[this.selected_tab_name]);
    console.log(all_grouping_map[this.selected_tab_name]);
    console.log(all_display_bools[this.selected_tab_name]);
    console.log(all_total_items[this.selected_tab_name]);
    console.log(all_group_legend[this.selected_tab_name]);
    console.log(all_graph_data[this.selected_tab_name]);
    console.log(all_network[this.selected_tab_name]);

    console.log("All values from current variables")
    console.log(this.current_grouping_key);
    console.log(this.current_grouping_map);
    console.log(this.current_display_bools);//
    console.log(this.current_total_items);
    console.log(this.current_group_legend);//
    console.log(this.current_graph_data);
    console.log(this.current_network);
  }
}