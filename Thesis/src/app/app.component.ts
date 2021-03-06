import { Component, Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {FormControl} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';

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

//Contains all data used to plot
let all_node_id_in_graph: IHash = {}; //contains mapping from tab to all node id in that tab 
let all_grouping_key: IHash = {}; //contains mapping from tab to all group ids
let all_grouping_map: IHash = {}; //contains mapping from tab to [a mapping from group id to list of DOI belong to that group]
let all_display_bools: IHash = {}; //contains mapping from tab to [a mapping from boolean decide if a DOI result is displayed]
let all_total_items: IHash = {}; //contains mapping from tab to total items of current grouping result
let all_group_legend: IHash = {}; //contains mapping from tab to group legend
let all_graph_data: IHash = {}; //contains mapping from tab to the graph data of that tab
let all_network: IHash = {}; //contains mapping from tab to the network of that tab
let all_echart_data: IHash = {}; //contains mapping from tab to echart data of that tab
let all_graph_data_array: IHash = {};

//graph scalling
let noOfCitation_scale = 20;
let publishTime_scale = 5; 


export interface IHash {
  [details: string]: any;
}




// search service to get 
@Injectable()
export class SearchService {
  apiRoot: string = 'https://opencitations.net/index/coci/api/v1/metadata';
  apiRoot2: string = 'https://api.crossref.org/works';

  quota = 100;
  counter = 0;
  pending_results = 0;

  constructor(private httpclient: HttpClient, private _snackBar: MatSnackBar) {

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
          this._snackBar.open("All Done!", "close", {
            duration: 2000,
          });
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
  constructor(private service: SearchService, private _snackBar: MatSnackBar) {}

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

    res = res + 'Worked on:' + '<br/>';
    for (let doi of author_to_doi_pointer[fullname]) {
      res = res + doi + '<br/>'
    }
    // res = res + '<br/>';
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
    if (all_node_id_in_graph[tabName] == null) {
      all_node_id_in_graph[tabName] = [];
    }

    if (mainData == 'author') {
      for (let author_name of node_id_author) {
        nodes.push({id: author_name, label: '', title: this.getStringAuthor(author_name), 
        value: author_to_doi_pointer[author_name].length});
        all_node_id_in_graph[tabName].push(author_name);
      }
      for (let doi of node_id) {
        for (let author of alldata_crossref[doi].author) {
          for (let author2 of alldata_crossref[doi].author) {
            let fullname1 = this.get_full_name(author);
            let fullname2 = this.get_full_name(author2);
            if (author != author2) {
              if (edges.some(e => e.id === fullname1+fullname2) || edges.some(e => e.id === fullname2+fullname1)) {
                // do nothing
              } else {
                edges.push({id: fullname1+fullname2, from: fullname1, to: fullname2});
              }
            }
          }
        }
      }
    } else {
      //Adding nodes and edges
      var node_counter = 0;
      for (let i of node_id) {
        var group_name = this.get_group(i, sortingOption);
        nodes.push({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + sortingOption + group_name, 
        group: group_name, value: mapping[i].length});
        all_node_id_in_graph[tabName].push(i);
        if (all_grouping_map[tabName][group_name] == null) {
          all_grouping_key[tabName].push(group_name);
          all_grouping_map[tabName][group_name] = [];
          all_group_legend[tabName][group_name] = {color: this.getRandomColor()};
        }
        all_grouping_map[tabName][group_name].push(alldata[i].doi);
        for (let j of mapping[i]) {
          edges.push({id: i+"|"+j, from: i, to: j, title:"from "+i+" to "+j});
        }

        all_display_bools[tabName][i] = true;
        node_counter++;
        if (node_counter > nodesOption) break;
      }
      //Counting total items
      all_total_items[tabName] = nodes.length + " items (" + all_grouping_key[tabName].length + " groups)";
    }
    // var container = document.getElementById('mynetwork');
    var container = document.getElementById(tabName);

    var data = {
      nodes: nodes,
      edges: edges
    }
    all_graph_data_array[tabName] = data;
    if (mainData == 'author') {
      this.plot_this(container, data, all_group_legend[tabName], tabName, 'author');
    } else {
      this.plot_this(container, data, all_group_legend[tabName], tabName, 'doi');
    }
    
  }

  get_group(index: string, selection: String) {
    switch(selection) {
      case "publishTime": 
        if (alldata[index].year == '') return "Undefined";
        return Math.floor(alldata[index].year / publishTime_scale) * publishTime_scale + "-" 
        + (Math.floor(alldata[index].year / publishTime_scale) * publishTime_scale + publishTime_scale-1);
      case "noOfCitation":
        var n = Math.floor(alldata[index].citation_count / noOfCitation_scale);
        if (n > 5) return  n*noOfCitation_scale + "+";
        return n*noOfCitation_scale + "-" + (n + 1)*noOfCitation_scale;
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

  plot_imported_graph(nodes: any, edges: any, legend: any, tabName: string) {
    all_grouping_key[tabName] = [];
    all_grouping_map[tabName] = {};
    all_display_bools[tabName] = {};
    for (let i of nodes) {
      var group_name = i.group;
      if (all_grouping_map[tabName][group_name] == null) {
        all_grouping_key[tabName].push(group_name);
        all_grouping_map[tabName][group_name] = [];
      }
      all_grouping_map[tabName][group_name].push(i.id);
      all_display_bools[tabName][i.id] = true;
    }
    all_group_legend[tabName] = legend;

    var container = document.getElementById('mynetwork');

    var data = {
      nodes: nodes,
      edges: edges
    }
    all_graph_data_array[tabName] = data;
    this.plot_this(container, data, legend, tabName, 'doi');


    console.log(nodes);
    console.log(JSON.stringify(nodes));
  }

  plot_graph_author(graph_id: string, author_name: string, sortingOption: string, tabName: string) {
    var nodes = [];
    var edges = [];

    all_grouping_key[tabName] = [];
    all_grouping_map[tabName] = {};
    if (all_node_id_in_graph[tabName] == null) {
      all_node_id_in_graph[tabName] = [];
    }

    var doi_list = author_to_doi_pointer[author_name];
    var node_counter = 0;
    for (let i of doi_list) {
      var group_name = this.get_group(i, sortingOption);
      nodes.push({id: i, label: '', title: this.getString(alldata[i]) + 'Group:' + sortingOption + group_name, 
      group: group_name, value: mapping[i].length});
      all_node_id_in_graph[tabName].push(i);
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
      nodes: nodes,
      edges: edges
    }
    all_graph_data_array[tabName] = data;
    this.plot_this(container, data, all_group_legend[tabName], tabName, 'doi');
  }

  plot_this(container: any, data: any, group_legend: any, tabName: string, mainData: string) {
    all_graph_data[tabName] = {
      nodes: new vis.DataSet(data.nodes),
      edges: new vis.DataSet(data.edges)
    }
    var options = {
      nodes: {
        shape: "dot",
        scaling: {
          customScalingFunction: function(min, max, total, value) {
            return value;
          },
          min: 20,
          max: 21
        },
        font: {
          size: 12,
          face: "Tahoma"
        },
        size: 16
      },
      edges: {
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

    if (mainData == 'author') {
      options.nodes.scaling.max = 25;
    }

    // if (+seed != 0) options.layout.randomSeed = Number(seed);
    var network = new vis.Network(container, all_graph_data[tabName], options);
    network.on("doubleClick", function(params) {
      console.log("Double clicked on node");
      params.event = "[original event]";
      const el = document.createElement('textarea');
      el.value = this.getNodeAt(params.pointer.DOM);
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      // console.log( this.getNodeAt(params.pointer.DOM));
      this._snackBar.open("DOI copied!", "close", {
        duration: 2000,
      });
    });

    all_network[tabName] = network;
  }
}





















@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  constructor(private plottingService: PlottingService, private _snackBar: MatSnackBar) {
  }

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

  graphOptions_2d_x = [
    {value: 'doi', viewValue: "DOI"},
    {value: 'publishTime', viewValue: 'Publish Time'},
    {value: 'topic', viewValue: 'Topic'}
  ]

  graphOptions_2d_y = [
    {value: 'noOfCitation', viewValue: 'Popularity'}
  ]

  mainDataOption = "doi";
  sortingOption = "publishTime";
  nodesOption = 10;
  colorOption = "default";
  graphOption_2d_x = "";
  graphOption_2d_y = "";

  content_ready = false;
  statistic = "";
  seed = undefined;
  textArea = "";
  textAreaData = "";

  current_nodes_in_graph = []; //
  current_grouping_key = []; //contains all group ids
  current_grouping_map = {}; //mapping from group id to list of DOI belong to that group
  current_display_bools = {}; //boolean decide if a DOI resul is displayed
  current_total_items = ""; //to be displayed
  current_group_legend = {};
  current_graph_data = {};
  current_network;
  graph_data_back_up = [];
  current_group_data_array = {};
          
  doSearch(DOI: HTMLInputElement) {
    this.openSnackBar("Getting data", "close");
    document.getElementById("starting_search_button").innerHTML = '<i class="fas fa-spinner"></i>';
    this.plottingService.doSearch(DOI);
    this.updateTab();
  }

  plot_graph(mainDataOption: string, sortingOption: string, nodesOption: number, colorOption: string, seed: string) {
    this.openSnackBar("Plotting", "Close");

    this.selected_tab_name = this.tabs[this.selected.value];
    this.plottingService.plot_graph(mainDataOption,sortingOption, nodesOption, colorOption, seed, this.selected_tab_name);
    this.updateTab();
    this.statistic = this.current_total_items;
    this.content_ready = true;

    for (let node of this.current_graph_data["nodes"].get()) {
      this.graph_data_back_up.push(node);
    }
  }

  select_node(nodeId: string) {
    this.current_network.selectNodes([nodeId]);
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


  select_group_node(groupId: string) {
    var list = [];
    this.current_grouping_map[groupId].forEach(element => {
      list.push(element);
    });
    this.current_network.selectNodes(list);
  }


  get_grouping_result(key: string) {
    var newGroupingResult = []
    for (let doi of this.current_grouping_map[key]) {
      if (this.current_display_bools[doi]) newGroupingResult.push(doi);
    }
    // return grouping_map[key];
    return newGroupingResult;
  }

  get_display_permission(DOI: string) {
    return this.current_display_bools[DOI];
  }


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

  check_group_display_permission(key: string) {
    for (let doi of this.current_grouping_map[key]) {
      if (this.current_display_bools[doi]) return true;
    }
    return false;
  }
  
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
  import_graph_data(input_text: string) {
    console.log(input_text);
    var obj = JSON.parse('{' + input_text + '}');
    console.log(obj);
    this.plottingService.plot_imported_graph(obj.nodes, obj.edges, obj.groups, this.tabs[this.selected.value]);
    this.statistic = this.current_total_items;
    this.content_ready = true;
    this.openSnackBar("Graph imported", "close");
  }
  export_graph_data() {
    this.textArea+='"nodes":' + JSON.stringify(this.current_group_data_array["nodes"], undefined, 2);
    this.textArea+=','
    this.textArea+='"edges":' + JSON.stringify(this.current_group_data_array["edges"], undefined, 2);
    this.textArea+=','
    this.textArea+='"groups":' + JSON.stringify(this.current_group_legend, undefined, 2);
    this.openSnackBar("Graph exported", "close");
  }
  import_data(input_text: string) {
    var obj = JSON.parse('{' + input_text + '}');
    node_id = obj.nodeid;
    alldata = obj.alldata;
    alldata_crossref = obj.alldatacrossref;
    this.process_imported_data();
    data_ready = true;
    this.updateTab()
    this.openSnackBar("Data imported", "close");
  }

  process_imported_data() {
    for(let DOI of node_id) {
      if (mapping[DOI] == null) {
        mapping[DOI] = [];
      }
      if (alldata[DOI].citation.length != 0) {
        var citations = alldata[DOI].citation.split(';');
        for (let i of citations) {
          i = i.replace(/\s/g, '');
          queue.push(i);
          if (mapping[DOI].indexOf(i) < 0){
            mapping[DOI].push(i);
          }
        }
      }
      for (let author of alldata_crossref[DOI].author) {
        let fullname = author.given + " " + author.family;
        if (node_id_author.indexOf(fullname) <= -1) {
          node_id_author.push(fullname);
        }
        if (author_to_doi_pointer[fullname] == null) {
          author_to_doi_pointer[fullname] = [];
        }
        author_to_doi_pointer[fullname].push(DOI);
      }
    }
  }

  export_data() {
    this.textAreaData+='"nodeid":' + JSON.stringify(node_id, undefined, 2);
    this.textAreaData+=','
    this.textAreaData+='"alldata":' + JSON.stringify(alldata, undefined, 2);
    this.textAreaData+=','
    this.textAreaData+='"alldatacrossref":' + JSON.stringify(alldata_crossref, undefined, 2);
    this._snackBar.open("Data exported!", "close", {
      duration: 2000,
    });
    this.openSnackBar("Data exported", "close");
  }

  //Sphere of influence
  sphere_influence(input_text: string) {
    console.log(input_text);
    this.current_graph_data["edges"].update({from: input_text, to: input_text, selfReferenceSize: 300});
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
      this.openSnackBar("Can't find connection", "close");
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
      this.openSnackBar("Connection found", "close");
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

  tabs = ['MainNetwork'];
  selected = new FormControl(0);
  selected_tab_name = this.tabs[this.selected.value];

  get_currently_selected_tab () {
    console.log(this.tabs[this.selected.value])
  }

  addTab(selectAfterAdding: boolean) {
    this.tabs.push('Network' + (this.tabs.length - 1));
    this.selected.setValue(this.tabs.length - 1);
    this.selected_tab_name = this.tabs[this.selected.value];
    this.openSnackBar("Added new tab", "close");
  }

  removeTab(index: number) {
    this.tabs.splice(index, 1);
    this.selected.setValue(this.tabs.length - 1);
    this.selected_tab_name = this.tabs[this.selected.value];
    this.openSnackBar("Tab removed", "close");
  }

  getTabName(index: number) {
    return this.tabs[index];
  }

  //For author's results area
  get_author_results() {
    var noticable_authors = [];
    for (let author of node_id_author) {
      if (author_to_doi_pointer[author].length > 1) noticable_authors.push(author);
    }
    return noticable_authors;
  }

  author_click(author_name: string) {
    console.log(author_name);
    if (!this.tabs.includes(author_name)) this.tabs.push(author_name);
    this.selected.setValue(this.tabs.length - 1);
    this.selected_tab_name = this.tabs[this.selected.value];
    this.plottingService.plot_graph_author(author_name, author_name, "publishTime", this.selected_tab_name);
  }


  //For tab management
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
    if (all_node_id_in_graph[this.selected_tab_name] == null) {all_node_id_in_graph[this.selected_tab_name] = []};
    if (all_graph_data_array[this.selected_tab_name] == null) {all_graph_data_array[this.selected_tab_name] = {}};

    this.current_grouping_key = all_grouping_key[this.selected_tab_name];
    this.current_grouping_key.sort();
    this.current_grouping_map = all_grouping_map[this.selected_tab_name];
    this.current_display_bools = all_display_bools[this.selected_tab_name];
    this.current_total_items = all_total_items[this.selected_tab_name];
    this.current_group_legend = all_group_legend[this.selected_tab_name];
    this.current_graph_data = all_graph_data[this.selected_tab_name];
    this.current_nodes_in_graph = all_node_id_in_graph[this.selected_tab_name];
    this.current_group_data_array = all_graph_data_array[this.selected_tab_name];

    if (all_network[this.selected_tab_name] != null) 
    this.current_network = all_network[this.selected_tab_name];

    if (this.get_data_status()){
      this.sliderParametersUpdate();
    }
    console.log("Tab information updated");
  
  }

  
  //For slider management
  slider_max = 0;
  slider_min = 3000;
  slider_value = 0;
  slider_step = 1;

  sliderParametersUpdate () {
    for (let doi of this.current_nodes_in_graph){
      if (alldata[doi].year < this.slider_min) this.slider_min = alldata[doi].year;
      if (alldata[doi].year > this.slider_max) this.slider_max = alldata[doi].year;
    }
    this.slider_value = this.slider_max;
  }
  
  sliderValue (value: number){
    // console.log(value);
    this.slider_value = value
    return value;
  }

  sliderUpdateGraph(event: any) {
    this.slider_value = event.value
    if (data_ready) {
      for (let doi of this.current_nodes_in_graph) {
        if (alldata[doi].year > this.slider_value) {
          console.log(this.current_graph_data["nodes"].get());
          console.log(this.graph_data_back_up);
          this.current_graph_data["nodes"].remove({id: doi});
        }
      }
      for (let item of this.graph_data_back_up) {
        if (alldata[item.id].year <= this.slider_value && !this.current_graph_data["nodes"].get(item.id)) {
          this.current_graph_data["nodes"].add(item);
        }
      }
      console.log( this.current_graph_data["nodes"]);
    }
  }

  //2d grap plotting
  plot_2d () {
    // var new_2d_tab_name = this.selected_tab_name+"2d";
    var new_2d_tab_name = this.graphOption_2d_x + "-stats" + (this.tabs.length - 1);
    if (!this.tabs.includes(new_2d_tab_name)) {
      this.tabs.push(new_2d_tab_name);
      this.selected.setValue(this.tabs.length - 1);
      this.selected_tab_name = this.tabs[this.selected.value];
    } else {
      this.selected.setValue(this.tabs.indexOf(new_2d_tab_name));
      this.selected_tab_name = this.tabs[this.selected.value];
    }
    
    var xdata = [];
    var ydata = [];

    var chartOption = {
      xAxis: {
        type: 'category',
        data: xdata
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: ydata,
        type: 'bar'
      }]
    }
    
    if (this.graphOption_2d_x == "doi" && this.graphOption_2d_y == "noOfCitation") {
      for (let doi of this.current_nodes_in_graph) {
        xdata.push(doi);
        ydata.push(alldata[doi].citation_count);
      }
      chartOption.xAxis["axisLabel"] = {rotate: 20, fontSize: 7};
      chartOption.xAxis["name"] = 'DOI';
      chartOption.yAxis["name"] = 'No Of Citations';
    } else if (this.graphOption_2d_x == "publishTime" && this.graphOption_2d_y == "noOfCitation") {
      for (let doi of this.current_nodes_in_graph) {
        if (!xdata.includes(alldata[doi].year)) {
          xdata.push(alldata[doi].year);
        }
      }
      xdata.sort();
      for (let year of xdata) {
        ydata.push(0);
      }
      for (let doi of this.current_nodes_in_graph) {
        ydata[xdata.indexOf(alldata[doi].year)] ++;
      }
      chartOption.series = [{data: ydata, type: 'line'}]
      chartOption.xAxis["name"] = 'Year';
      chartOption.yAxis["name"] = 'No of Papers';
    } else if (this.graphOption_2d_x == "topic" && this.graphOption_2d_y == "noOfCitation") {
      var topicHash = {};
      for (let doi of this.current_nodes_in_graph) {
        console.log(alldata_crossref[doi]["short-container-title"][0]);
        if (!xdata.includes(alldata_crossref[doi]["short-container-title"][0])) {
          xdata.push(alldata_crossref[doi]["short-container-title"][0]);
          topicHash[alldata_crossref[doi]["short-container-title"][0]] = 1;
        } else {
          topicHash[alldata_crossref[doi]["short-container-title"][0]] ++;
        }
      }
      for (let x of xdata) {
        ydata.push(topicHash[x]);
      }
      chartOption.xAxis["axisLabel"] = {rotate: 20, fontSize: 8};
      chartOption.xAxis["name"] = 'Topic';
      chartOption.yAxis["name"] = 'No Of Papers';
    } else if (this.graphOption_2d_x == "type" && this.graphOption_2d_y == "noOfCitation") {
      for (let doi of this.current_nodes_in_graph) {
        // TODO
      }
    } else {
      return
    }

    all_echart_data[new_2d_tab_name] = chartOption;
    this.openSnackBar("Plotted statistic graph", "close");
  }

  getEchartData(tabName: string) {
    return all_echart_data[tabName];
  }

  
  //Snackbar
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 2000,
    });
  }

  updateColors() {
    this.current_network.body.emitter.emit('_dataChanged');
    this.current_network.redraw();
  }

}