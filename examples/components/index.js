var mixinsObj = {
  created() {
    console.log("mixin created")
  },
  data() {
    return {
      count: "mixin",
      otherCount: 'mixinOtherCount'
    }
  },
  methods: {
    handleChildClick () { 
      console.log("mixin handleChildClick")
    }
  },
  watch: {
    count: {
      handler:function(val,oldval) {
        console.log('watch mixin val', oldval, val)
      }
    }
  },
  computed: {
    other () { 
      console.log('computed mixin this.count', this.count)
      return this.count+1
    }
  }
}
