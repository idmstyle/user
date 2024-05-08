(async function (window) {
    'use strict';
    
    const vm = new Vue({
        el: '#app',
        delimiters: ['<{', '}>'],
        data: {
            user: {},
            products: [],
            categories: [],
            albums: [],
            current: {},
            editFormVisible: false,
            isNew: false,
            params: {
                category: "",
                name: "",
                owner: "",
                description: "",
            },
            isAlbumLoading: true,
            albumImportResult: [],
            isLoading: false,
            isInfiniteScrollDisabled: false,
            currentPage: 1,
            pageCount: 1,
            isPaginationDisabled: false,
        },
        mounted: function() {
            const vm = this;
            const user = JSON.parse(window.localStorage.getItem('user'));
            this.user = user;

            return new Promise(async function (resolve, reject) {
                let url = 'https://cdn.jsdelivr.net/gh/idmstyle/user-storage-KargBfbp/product/index.json';
                url = `https://idmstyle.github.io/user-storage-${user.username}/product/index.json`
                const response = await axios.get(url);
                const data = response.data;
                vm.categories = data;
            });
        },
        methods: {
            handleCategoryChanged: async function () {
                const category = this.params.category;
                const url = `https://idmstyle.github.io/user-storage-${this.user.username}/product/${category}/index.json`
                const response = await axios.get(url);
                const files = [];
                for(let filename of response.data) {
                    const file = {
                        name: filename.slice(0, filename.lastIndexOf('.')),
                        url: `https://idmstyle.github.io/user-storage-${this.user.username}/product/${category}/${filename}`
                    };
                    files.push(file);
                }

                this.products = files;
            },
            handleAddToCart: async function (product) {
                let products = window.localStorage.getItem('shopping-cart');
                products = !products ? [] : JSON.parse(products);
                products.push(product);
                window.localStorage.setItem('shopping-cart', JSON.stringify(products));
                this.$message({type: 'success', message: '添加成功'});
            },
            handleShowNewAlbumDialog: function () {
                this.current = {_id: '', code: '', path: ''};
    
                this.isNew = true;
                this.editFormVisible = true;
            },
            hanleSaveNewAlbum: async function () {
                this.current.code = this.current._id;
                try {
                    const response = await axios.post('album/create', this.current);
                    const result = response.data;
                    if (result.ok) {
                        this.current._rev = result.rev;
                        this.albums.unshift(this.current);
                    }
                    this.$message({type: 'success', message: '更新成功'});
                    this.editFormVisible = false;
                } catch (error) {
                    if (error.name == 'conflict') {
                        this.$message({type: 'error', message: '相册短代码/ID冲突，请使用新的短代码'});
                        return ;
                    }
                    return this.$message({type: 'error', message: '更新出错，请稍后重试'});
                }
            },
            handleLoadAlbums: async function(page = null) {
                this.isAlbumLoading = true;
                this.isPaginationDisabled = false;
                let currentPage = page == null ? this.currentPage : page;
    
                const params = this.params;
                const selector = {};
                if (!!params.id) selector['_id'] = params.id;
                if(!!params.name) selector['name'] = {'$regex': '.*' + params.name + '.*'};
                if (!!params.owner) selector['owner'] = {'$regex': '.*' + params.owner + '.*'};
                if (!!params.description) selector['description'] = {'$regex': '.*' + params.description + '.*'};
    
                const options = {
                    selector: selector,
                    limit: 40
                }
                options.skip = options.limit * (currentPage - 1);
                const response = await axios.post('dms://localhost/album/get', options);
    
                // 数据到最后一页了
                if (response.data.length < options.limit) {
                    this.isInfiniteScrollDisabled = true;
                    
                    this.pageCount = currentPage;
    
                    // 实际测试中发现，只把 pageCount 设置为1，并不会禁用下一页的按钮
                    // 当只有一页时，可以直接禁用翻页功能
                    if (this.pageCount == 1) this.isPaginationDisabled = true;
                }
                
                this.albums = response.data;
                this.isAlbumLoading = false;
            },
            handleSearch: async function () {
                this.currentPage = 1;
                this.isInfiniteScrollDisabled = false;
                this.handleLoadAlbums();
            },
            handleCurrentPageChange: async function (current) {
                this.handleLoadAlbums(current);
            },
            handleShowAlbumDetail: function(album) {
                const url = 'view/album/detail.html?id=' + album._id;
                const title = `${album._id} - ${album.name} - 相册详情`;
                openNewTab(title, url);
            },
            handleSelectDirectory: async function () {
                const response = await axios.get('/dialog/selectDirectory');
                this.current.path = response.data;
            },
            handleResetSearchParams: async function () {
                for(let name in this.params) this.params[name] = '';
                this.currentPage = 1;
                this.handleLoadAlbums();
            }
        }
    });
    
    })(window);